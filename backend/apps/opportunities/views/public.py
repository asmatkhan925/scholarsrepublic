"""
Public & student-facing views: pathway browsing, opportunity/scholarship lists,
matching, recommended, picker, and comments.
"""
import logging

from django.db.models import F, Prefetch, Q
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.opportunities.matching import calculate_opportunity_match
from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityComment,
)
from apps.opportunities.serializers import (
    OpportunityCommentCreateSerializer,
    OpportunityCommentReplySerializer,
    OpportunityCommentSerializer,
    OpportunityDetailSerializer,
    OpportunityListSerializer,
    OpportunityPathwaySerializer,
    PublicOpportunityCollectionSerializer,
)
from apps.users.models import User

from ._shared import (
    IsStudentUser,
    OpportunityFilterMixin,
    StudentMatchMixin,
    parse_bool,
    parse_positive_int,
    public_pathway_queryset,
)

logger = logging.getLogger(__name__)


class PublicOpportunityPathwayListView(generics.ListAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = public_pathway_queryset()
        params = self.request.query_params

        country = params.get("country")
        if country:
            queryset = queryset.filter(
                Q(country_ref__name__iexact=country) | Q(country_ref__slug__iexact=country)
            )

        country_id = parse_positive_int(params.get("country_id"))
        if country_id:
            queryset = queryset.filter(country_ref_id=country_id)

        pathway_type = params.get("pathway_type")
        if pathway_type:
            queryset = queryset.filter(pathway_type=pathway_type)

        parent = params.get("parent")
        if parent:
            queryset = queryset.filter(parent__slug=parent)

        parent_id = parse_positive_int(params.get("parent_id"))
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)

        if parse_bool(params.get("root_only")):
            queryset = queryset.filter(parent__isnull=True)

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return queryset.order_by("display_order", "title")


class PublicOpportunityPathwayDetailView(generics.RetrieveAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return public_pathway_queryset()


class PublicOpportunityListView(OpportunityFilterMixin, generics.ListAPIView):
    serializer_class = OpportunityListSerializer
    permission_classes = [permissions.AllowAny]

    def _has_public_search_query(self):
        params = self.request.query_params
        return bool(
            (params.get("search") or "").strip()
            or (params.get("q") or "").strip()
        )

    def _apply_public_expiration_filter(self, queryset):
        params = self.request.query_params
        today = timezone.localdate()

        include_expired = parse_bool(params.get("include_expired"))
        expired = parse_bool(params.get("expired"))
        has_search = self._has_public_search_query()

        expired_filter = {
            "is_rolling_deadline": False,
            "deadline__isnull": False,
            "deadline__lt": today,
        }

        if expired is True:
            return queryset.filter(**expired_filter)

        if include_expired is True or has_search:
            return queryset

        return queryset.exclude(**expired_filter)

    def get_queryset(self):
        queryset = (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
                "pathway__parent__parent",
                "pathway__parent__parent__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )

        return self._apply_public_expiration_filter(queryset)


class PublicOpportunityDetailView(generics.RetrieveAPIView):
    serializer_class = OpportunityDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
                "pathway__parent__parent",
                "pathway__parent__parent__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
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


class PublicScholarshipCollectionDetailView(generics.RetrieveAPIView):
    serializer_class = PublicOpportunityCollectionSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            OpportunityCollection.objects.filter(
                status__in=[
                    OpportunityCollection.Status.APPROVED,
                    OpportunityCollection.Status.POSTED,
                ]
            )
            .prefetch_related(
                "items__opportunity",
                "items__opportunity__country_ref",
                "items__opportunity__study_field_refs",
            )
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
    limit = 50

    def get_user_state_maps(self, request, opportunity_ids):
        saved_by_opportunity = dict(
            SavedOpportunity.objects.filter(
                user=request.user,
                opportunity_id__in=opportunity_ids,
            ).values_list("opportunity_id", "id")
        )
        applications_by_opportunity = dict(
            OpportunityApplication.objects.filter(
                user=request.user,
                opportunity_id__in=opportunity_ids,
            ).values_list("opportunity_id", "id")
        )

        return saved_by_opportunity, applications_by_opportunity

    def serialize_recommended_opportunity(
        self,
        request,
        opportunity,
        saved_by_opportunity,
        applications_by_opportunity,
    ):
        data = OpportunityListSerializer(opportunity, context={"request": request}).data
        saved_id = saved_by_opportunity.get(opportunity.id)
        application_id = applications_by_opportunity.get(opportunity.id)

        data["is_saved"] = saved_id is not None
        data["saved_opportunity_id"] = saved_id
        data["is_tracking"] = application_id is not None
        data["application_id"] = application_id

        return data

    def get(self, request):
        profile = self.get_profile(request)
        if not profile:
            return self.profile_missing_response()

        queryset = self.filter_queryset(self.get_published_queryset())
        opportunities = list(queryset[:200])
        opportunity_ids = [opportunity.id for opportunity in opportunities]
        saved_by_opportunity, applications_by_opportunity = self.get_user_state_maps(
            request,
            opportunity_ids,
        )

        recommendations = []
        for opportunity in opportunities:
            match = calculate_opportunity_match(profile, opportunity)
            recommendations.append(
                {
                    "opportunity": self.serialize_recommended_opportunity(
                        request,
                        opportunity,
                        saved_by_opportunity,
                        applications_by_opportunity,
                    ),
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


class ScholarshipPickerView(StudentMatchMixin, APIView):
    """Compact authenticated picker for SOP scholarship selection."""

    limit = 20
    max_limit = 50
    pool_size = 120
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP

    def get_saved_ids(self, request):
        return set(
            SavedOpportunity.objects.filter(
                user=request.user,
                opportunity__status=Opportunity.Status.PUBLISHED,
                opportunity__opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            ).values_list("opportunity_id", flat=True)
        )

    def apply_search(self, queryset, query):
        if not query:
            return queryset

        return queryset.filter(
            Q(title__icontains=query)
            | Q(provider_name__icontains=query)
            | Q(university_name__icontains=query)
            | Q(country_ref__name__icontains=query)
            | Q(study_field_refs__name__icontains=query)
            | Q(short_description__icontains=query)
            | Q(search_keywords__icontains=query)
        ).distinct()

    def serialize_picker_item(self, request, opportunity, is_saved, match_score):
        data = OpportunityListSerializer(opportunity, context={"request": request}).data
        data["is_saved"] = bool(is_saved)
        data["match_score"] = match_score
        return data

    def get(self, request):
        raw_limit = parse_positive_int(request.query_params.get("limit"))
        limit = min(raw_limit or self.limit, self.max_limit)
        query = (request.query_params.get("q") or "").strip()

        saved_ids = self.get_saved_ids(request)
        profile = self.get_profile(request)

        queryset = (
            Opportunity.objects.filter(
                status=Opportunity.Status.PUBLISHED,
                opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            )
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
                "pathway__parent__parent",
                "pathway__parent__parent__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )

        queryset = self.apply_search(queryset, query).order_by(
            "-featured",
            F("deadline").asc(nulls_last=True),
            "-published_at",
            "title",
        )

        saved_opportunities = list(queryset.filter(id__in=saved_ids)[: self.max_limit])
        other_opportunities = list(
            queryset.exclude(id__in=saved_ids)[: max(self.pool_size, limit * 5)]
        )

        ranked_items = []
        seen_ids = set()

        for opportunity in [*saved_opportunities, *other_opportunities]:
            if opportunity.id in seen_ids:
                continue
            seen_ids.add(opportunity.id)

            match_score = None
            if profile:
                try:
                    match_score = calculate_opportunity_match(profile, opportunity).get("score")
                except Exception:
                    match_score = None

            is_saved = opportunity.id in saved_ids
            rank_group = 0 if is_saved else (1 if match_score is not None else 2)

            ranked_items.append(
                {
                    "opportunity": opportunity,
                    "is_saved": is_saved,
                    "match_score": match_score,
                    "rank_group": rank_group,
                }
            )

        ranked_items.sort(
            key=lambda item: (
                item["rank_group"],
                -(item["match_score"] or -1),
                item["opportunity"].title.lower(),
            )
        )

        results = [
            self.serialize_picker_item(
                request,
                item["opportunity"],
                item["is_saved"],
                item["match_score"],
            )
            for item in ranked_items[:limit]
        ]

        return Response({"count": len(results), "results": results})


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

        approved_replies = OpportunityComment.objects.filter(is_deleted=False).select_related(
            "user"
        )
        comments = (
            OpportunityComment.objects.filter(
                opportunity=opportunity,
                parent__isnull=True,
                is_deleted=False,
            )
            .select_related("user")
            .prefetch_related(Prefetch("replies", queryset=approved_replies))
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
            return Response(
                {"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED
            )

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
            moderation_status=OpportunityComment.ModerationStatus.PENDING,
            is_deleted=True,
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
                is_deleted=False,
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
            moderation_status=OpportunityComment.ModerationStatus.PENDING,
            is_deleted=True,
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
            return Response(
                {"detail": "You cannot delete this comment."}, status=status.HTTP_403_FORBIDDEN
            )

        comment.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
