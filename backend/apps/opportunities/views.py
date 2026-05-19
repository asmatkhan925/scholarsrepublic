from django.db.models import Count, F, Prefetch, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.opportunities.matching import calculate_opportunity_match
from apps.opportunities.models import Opportunity, OpportunityComment, OpportunityDraft, OpportunityPathway
from apps.opportunities.serializers import (
    AdminOpportunityCommentSerializer,
    OpportunityAdminSerializer,
    OpportunityCommentCreateSerializer,
    OpportunityDraftSerializer,
    OpportunityCommentReplySerializer,
    OpportunityCommentSerializer,
    OpportunityDetailSerializer,
    OpportunityListSerializer,
    OpportunityPathwaySerializer,
)
from apps.opportunities.services.opportunity_draft_importer import (
    import_opportunity_draft,
    validate_opportunity_draft_payload,
)
from apps.users.models import User


def parse_bool(value):
    if value is None:
        return None
    return str(value).lower() in {"1", "true", "yes", "on"}


def parse_positive_int(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    return parsed if parsed > 0 else None


def collect_pathway_and_descendant_ids(pathways):
    seen = set()
    queue = list(pathways.values_list("id", flat=True))

    while queue:
        current_ids = []

        for pathway_id in queue:
            if pathway_id not in seen:
                current_ids.append(pathway_id)
                seen.add(pathway_id)

        if not current_ids:
            break

        queue = list(
            OpportunityPathway.objects.filter(
                is_active=True,
                parent_id__in=current_ids,
            ).values_list("id", flat=True)
        )

    return list(seen)


def public_pathway_queryset():
    return (
        OpportunityPathway.objects.filter(is_active=True)
        .select_related("country_ref", "parent")
        .annotate(
            active_children_count=Count(
                "children",
                filter=Q(children__is_active=True),
                distinct=True,
            ),
            direct_published_opportunity_count=Count(
                "opportunities",
                filter=Q(opportunities__status=Opportunity.Status.PUBLISHED),
                distinct=True,
            ),
        )
    )


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

        opportunity_status = params.get("status")
        if opportunity_status:
            queryset = queryset.filter(status=opportunity_status)

        opportunity_type = params.get("opportunity_type")
        if opportunity_type:
            queryset = queryset.filter(opportunity_type=opportunity_type)

        pathway_id = parse_positive_int(params.get("pathway_id"))
        pathway = params.get("pathway")
        if pathway_id or pathway:
            pathways = OpportunityPathway.objects.filter(is_active=True)

            if pathway_id:
                pathways = pathways.filter(pk=pathway_id)
            else:
                pathway_as_id = parse_positive_int(pathway)
                if pathway_as_id:
                    pathways = pathways.filter(pk=pathway_as_id)
                else:
                    pathways = pathways.filter(slug=pathway)

            if parse_bool(params.get("exact_pathway")):
                pathway_ids = list(pathways.values_list("id", flat=True))
            else:
                pathway_ids = collect_pathway_and_descendant_ids(pathways)

            if not pathway_ids:
                return queryset.none()

            queryset = queryset.filter(pathway_id__in=pathway_ids)

        pathway_type = params.get("pathway_type")
        if pathway_type:
            queryset = queryset.filter(pathway__pathway_type=pathway_type)

        application_track = params.get("application_track")
        if application_track:
            queryset = queryset.filter(application_track=application_track)

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

    def get_queryset(self):
        return (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )


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


class AdminOpportunityListCreateView(OpportunityFilterMixin, generics.ListCreateAPIView):
    permission_classes = [IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return OpportunityListSerializer

        return OpportunityAdminSerializer

    def get_queryset(self):
        return (
            Opportunity.objects.all()
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )


class AdminOpportunityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return OpportunityDetailSerializer

        return OpportunityAdminSerializer

    def get_queryset(self):
        return (
            Opportunity.objects.all()
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )


class AdminOpportunityDraftListCreateView(generics.ListCreateAPIView):
    serializer_class = OpportunityDraftSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = (
            OpportunityDraft.objects.all()
            .select_related(
                "created_opportunity",
                "created_opportunity__country_ref",
                "created_opportunity__pathway",
                "created_by",
            )
            .prefetch_related(
                "created_opportunity__eligible_country_refs",
                "created_opportunity__eligible_region_refs",
                "created_opportunity__study_field_refs",
            )
        )

        draft_status = self.request.query_params.get("status")
        if draft_status:
            queryset = queryset.filter(status=draft_status)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(source_name__icontains=search)
                | Q(source_url__icontains=search)
                | Q(slug__icontains=search)
            )

        return queryset.order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminOpportunityDraftDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OpportunityDraftSerializer
    permission_classes = [IsPlatformAdmin]
    queryset = OpportunityDraft.objects.all()


class AdminOpportunityDraftValidateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        try:
            draft = OpportunityDraft.objects.get(pk=pk)
        except OpportunityDraft.DoesNotExist:
            return Response({"detail": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)

        cleaned, warnings, errors = validate_opportunity_draft_payload(draft.raw_payload)
        opportunity = cleaned.get("opportunity", {})

        draft.confidence = cleaned.get("confidence", "")
        draft.source_url = opportunity.get("source_url", "")
        draft.source_name = opportunity.get("source_name", "")
        draft.validation_warnings = warnings
        draft.validation_errors = errors
        draft.status = OpportunityDraft.Status.ERROR if errors else OpportunityDraft.Status.VALIDATED

        if not draft.created_by_id:
            draft.created_by = request.user

        draft.save(
            update_fields=[
                "created_by",
                "confidence",
                "source_url",
                "source_name",
                "validation_warnings",
                "validation_errors",
                "status",
                "updated_at",
            ]
        )

        return Response(OpportunityDraftSerializer(draft, context={"request": request}).data)


class AdminOpportunityDraftImportView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        try:
            draft = OpportunityDraft.objects.get(pk=pk)
        except OpportunityDraft.DoesNotExist:
            return Response({"detail": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)

        opportunity = import_opportunity_draft(draft, user=request.user)

        draft.refresh_from_db()

        if not opportunity:
            return Response(
                {
                    "detail": "Draft could not be imported. Review validation errors.",
                    "draft": OpportunityDraftSerializer(draft, context={"request": request}).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "draft": OpportunityDraftSerializer(draft, context={"request": request}).data,
                "opportunity": OpportunityListSerializer(
                    opportunity,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


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
        opportunities = list(queryset[:100])
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


class AdminOpportunityCommentListView(generics.ListAPIView):
    serializer_class = AdminOpportunityCommentSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = (
            OpportunityComment.objects.select_related("user", "opportunity", "parent")
            .annotate(moderation_replies_count=Count("replies"))
            .order_by("-created_at")
        )

        moderation_status = self.request.query_params.get("status")
        if moderation_status in {
            OpportunityComment.ModerationStatus.PENDING,
            OpportunityComment.ModerationStatus.ACTIVE,
            OpportunityComment.ModerationStatus.DELETED,
        }:
            queryset = queryset.filter(moderation_status=moderation_status)


        comment_type = self.request.query_params.get("type")
        if comment_type == "top_level":
            queryset = queryset.filter(parent__isnull=True)
        elif comment_type == "reply":
            queryset = queryset.filter(parent__isnull=False)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(body__icontains=search)
                | Q(opportunity__title__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )

        return queryset


class AdminOpportunityCommentModerateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        try:
            comment = OpportunityComment.objects.select_related("user", "opportunity", "parent").get(pk=pk)
        except OpportunityComment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")

        if action == "approve":
            if not comment.body:
                return Response(
                    {"detail": "Deleted comments without body cannot be approved."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            comment.moderation_status = OpportunityComment.ModerationStatus.ACTIVE
            comment.is_deleted = False
            comment.save(update_fields=["moderation_status", "is_deleted", "updated_at"])

        elif action == "hide":
            if not comment.body:
                return Response(
                    {"detail": "Deleted comments without body are already hidden."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            comment.moderation_status = OpportunityComment.ModerationStatus.PENDING
            comment.is_deleted = True
            comment.save(update_fields=["moderation_status", "is_deleted", "updated_at"])

        elif action == "delete":
            comment.soft_delete()

        else:
            return Response(
                {"detail": "Invalid action. Use approve, hide, or delete."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(AdminOpportunityCommentSerializer(comment, context={"request": request}).data)


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
