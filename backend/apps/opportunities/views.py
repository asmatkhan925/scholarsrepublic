from django.db.models import F, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.opportunities.matching import calculate_opportunity_match
from apps.opportunities.models import Opportunity, OpportunityComment
from apps.opportunities.serializers import (
    OpportunityAdminSerializer,
    OpportunityDetailSerializer,
    OpportunityCommentCreateSerializer,
    OpportunityCommentReplySerializer,
    OpportunityCommentSerializer,
    OpportunityListSerializer,
)
from apps.users.models import User


def parse_bool(value):
    if value is None:
        return None
    return str(value).lower() in {"1", "true", "yes", "on"}


class IsPlatformAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == User.Role.ADMIN
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsStudentUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
        )


class OpportunityFilterMixin:
    allowed_ordering = {
        "deadline": "deadline",
        "-deadline": "-deadline",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "published_at": "published_at",
        "-published_at": "-published_at",
    }

    def filter_queryset(self, queryset):
        params = self.request.query_params

        opportunity_type = params.get("opportunity_type")
        if opportunity_type:
            queryset = queryset.filter(opportunity_type=opportunity_type)

        country = params.get("country")
        if country:
            country_text_fallback = (
                Q(title__icontains=country)
                | Q(short_description__icontains=country)
                | Q(provider_name__icontains=country)
                | Q(university_name__icontains=country)
                | Q(search_keywords__icontains=country)
            )

            queryset = queryset.filter(
                Q(country_ref__name__iexact=country)
                | Q(eligible_country_refs__name__iexact=country)
                | Q(eligible_region_refs__name__iexact=country)
                | country_text_fallback
            ).distinct()

        degree_level = params.get("degree_level")
        if degree_level:
            queryset = queryset.filter(degree_levels__contains=[degree_level])

        field = params.get("field")
        if field:
            queryset = queryset.filter(
                Q(study_field_refs__name__iexact=field) | Q(all_study_fields=True)
            ).distinct()

        funding_type = params.get("funding_type")
        if funding_type:
            queryset = queryset.filter(funding_type=funding_type)

        verified = parse_bool(params.get("verified"))
        if verified is not None:
            queryset = queryset.filter(verified_status=verified)

        featured = parse_bool(params.get("featured"))
        if featured is not None:
            queryset = queryset.filter(featured=featured)

        no_ielts = parse_bool(params.get("no_ielts"))
        if no_ielts is not None:
            queryset = queryset.filter(ielts_required=not no_ielts)

        no_application_fee = parse_bool(params.get("no_application_fee"))
        if no_application_fee is not None:
            queryset = queryset.filter(application_fee_required=not no_application_fee)

        hec_required = parse_bool(params.get("hec_required"))
        if hec_required is not None:
            queryset = queryset.filter(hec_required=hec_required)

        remote = parse_bool(params.get("remote"))
        if remote is not None:
            queryset = queryset.filter(
                location_type=(
                    Opportunity.LocationType.REMOTE if remote else Opportunity.LocationType.ON_SITE
                )
            )

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(provider_name__icontains=search)
                | Q(university_name__icontains=search)
                | Q(company_name__icontains=search)
                | Q(country_ref__name__icontains=search)
                | Q(eligible_country_refs__name__icontains=search)
                | Q(eligible_region_refs__name__icontains=search)
                | Q(study_field_refs__name__icontains=search)
                | Q(city__icontains=search)
                | Q(short_description__icontains=search)
                | Q(description__icontains=search)
                | Q(search_keywords__icontains=search)
            )

        ordering = params.get("ordering")
        if ordering in self.allowed_ordering:
            return queryset.order_by(self.allowed_ordering[ordering])

        return queryset.order_by(
            "-featured",
            F("deadline").asc(nulls_last=True),
            "-published_at",
        )


class PublicOpportunityListView(OpportunityFilterMixin, generics.ListAPIView):
    serializer_class = OpportunityListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED).select_related("country_ref").prefetch_related(
            "eligible_country_refs",
            "eligible_region_refs",
            "study_field_refs",
        )


class PublicOpportunityDetailView(generics.RetrieveAPIView):
    serializer_class = OpportunityDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED).select_related("country_ref").prefetch_related(
            "eligible_country_refs",
            "eligible_region_refs",
            "study_field_refs",
        )


class PublicScholarshipListView(PublicOpportunityListView):
    def get_queryset(self):
        return (
            super().get_queryset().filter(opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP)
        )


class PublicScholarshipDetailView(PublicOpportunityDetailView):
    def get_queryset(self):
        return (
            super().get_queryset().filter(opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP)
        )


class AdminOpportunityListCreateView(OpportunityFilterMixin, generics.ListCreateAPIView):
    serializer_class = OpportunityAdminSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        return Opportunity.objects.all()


class AdminOpportunityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OpportunityAdminSerializer
    permission_classes = [IsPlatformAdmin]
    queryset = Opportunity.objects.all()


class StudentMatchMixin:
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]
    opportunity_type = None

    def get_profile(self, request):
        if not hasattr(request.user, "student_profile"):
            return None
        return request.user.student_profile

    def get_published_queryset(self):
        queryset = Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
        if self.opportunity_type:
            queryset = queryset.filter(opportunity_type=self.opportunity_type)
        return queryset

    def profile_missing_response(self):
        return Response(
            {"detail": "Complete your student profile to calculate a match score."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class OpportunityMatchView(StudentMatchMixin, APIView):
    def get(self, request, slug):
        profile = self.get_profile(request)
        if not profile:
            return self.profile_missing_response()

        try:
            opportunity = self.get_published_queryset().get(slug=slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(calculate_opportunity_match(profile, opportunity))


class ScholarshipMatchView(OpportunityMatchView):
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP


class RecommendedOpportunitiesView(OpportunityFilterMixin, StudentMatchMixin, APIView):
    limit = 20

    def get(self, request):
        profile = self.get_profile(request)
        if not profile:
            return self.profile_missing_response()

        queryset = self.filter_queryset(self.get_published_queryset())
        recommendations = []
        for opportunity in queryset[:100]:
            match = calculate_opportunity_match(profile, opportunity)
            recommendations.append(
                {
                    "opportunity": OpportunityListSerializer(opportunity).data,
                    "match": match,
                }
            )

        recommendations.sort(
            key=lambda item: (
                item["match"]["score"],
                item["opportunity"]["featured"],
            ),
            reverse=True,
        )
        recommendations = recommendations[: self.limit]
        return Response({"count": len(recommendations), "results": recommendations})


class RecommendedScholarshipsView(RecommendedOpportunitiesView):
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP


class ScholarshipCommentThrottle(UserRateThrottle):
    scope = "scholarship_comments"
    rate = "10/hour"


class ScholarshipCommentListCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScholarshipCommentThrottle]

    def get_throttles(self):
        if self.request.method == "GET":
            return []

        return super().get_throttles()

    def get_opportunity(self, slug):
        return Opportunity.objects.get(
            slug=slug,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            status=Opportunity.Status.PUBLISHED,
        )

    def get(self, request, slug):
        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        comments = (
            OpportunityComment.objects.filter(opportunity=opportunity, parent__isnull=True)
            .select_related("user")
            .prefetch_related("replies__user")
            .order_by("-created_at")
        )

        serializer = OpportunityCommentSerializer(
            comments,
            many=True,
            context={"request": request},
        )
        return Response({"count": comments.count(), "results": serializer.data})

    def post(self, request, slug):
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OpportunityCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = OpportunityComment.objects.create(
            opportunity=opportunity,
            user=request.user,
            body=serializer.validated_data["body"],
        )

        return Response(
            OpportunityCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ScholarshipCommentReplyCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScholarshipCommentThrottle]

    def post(self, request, slug, pk):
        try:
            opportunity = Opportunity.objects.get(
                slug=slug,
                opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
                status=Opportunity.Status.PUBLISHED,
            )
        except Opportunity.DoesNotExist:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            parent = OpportunityComment.objects.get(
                pk=pk,
                opportunity=opportunity,
                parent__isnull=True,
            )
        except OpportunityComment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OpportunityCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reply = OpportunityComment.objects.create(
            opportunity=opportunity,
            user=request.user,
            parent=parent,
            body=serializer.validated_data["body"],
        )

        return Response(
            OpportunityCommentReplySerializer(reply, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OpportunityCommentDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            comment = OpportunityComment.objects.select_related("user").get(pk=pk)
        except OpportunityComment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        can_delete = (
            comment.user_id == request.user.id
            or request.user.role == User.Role.ADMIN
            or request.user.is_staff
            or request.user.is_superuser
        )

        if not can_delete:
            return Response({"detail": "You cannot delete this comment."}, status=status.HTTP_403_FORBIDDEN)

        comment.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
