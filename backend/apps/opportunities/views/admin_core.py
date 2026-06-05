"""
Admin CRUD views: opportunities, drafts, pathways, overview, comments.
"""
import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.opportunities.models import (
    Opportunity,
    OpportunityComment,
    OpportunityDraft,
    OpportunityPathway,
)
from apps.opportunities.serializers import (
    AdminOpportunityCommentSerializer,
    OpportunityAdminSerializer,
    OpportunityCommentCreateSerializer,
    OpportunityCommentSerializer,
    OpportunityDetailSerializer,
    OpportunityDraftSerializer,
    OpportunityListSerializer,
    OpportunityPathwaySerializer,
)
from apps.opportunities.services.duplicate_detector import find_duplicate_opportunities
from apps.opportunities.services.opportunity_draft_importer import (
    import_opportunity_draft,
    validate_opportunity_draft_payload,
)
from apps.users.models import User

from ._shared import (
    IsPlatformAdmin,
    OpportunityFilterMixin,
    parse_bool,
    parse_positive_int,
)

logger = logging.getLogger(__name__)


class AdminOpportunityPathwayListCreateView(generics.ListCreateAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = (
            OpportunityPathway.objects.all()
            .select_related(
                "country_ref",
                "parent",
                "parent__parent",
                "parent__parent__parent",
            )
            .annotate(
                active_children_count=Count(
                    "children",
                    filter=Q(children__is_active=True),
                    distinct=True,
                )
            )
        )

        params = self.request.query_params

        active = parse_bool(params.get("active"))
        if active is not None:
            queryset = queryset.filter(is_active=active)

        root_only = parse_bool(params.get("root_only"))
        if root_only is not None:
            queryset = queryset.filter(parent__isnull=root_only)

        parent = params.get("parent")
        if parent:
            queryset = queryset.filter(parent__slug=parent)

        parent_id = parse_positive_int(params.get("parent_id"))
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)

        pathway_type = params.get("pathway_type")
        if pathway_type:
            queryset = queryset.filter(pathway_type=pathway_type)

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
                | Q(country_ref__name__icontains=search)
            )

        return queryset.order_by("display_order", "title")


class AdminOpportunityPathwayDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [IsPlatformAdmin]
    queryset = OpportunityPathway.objects.select_related(
        "country_ref",
        "parent",
        "parent__parent",
        "parent__parent__parent",
    ).all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


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
                "pathway__parent__parent",
                "pathway__parent__parent__parent",
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
                "pathway__parent__parent",
                "pathway__parent__parent__parent",
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

        if parse_bool(self.request.query_params.get("needs_review")):
            queryset = queryset.filter(created_opportunity__isnull=True).exclude(
                status=OpportunityDraft.Status.IMPORTED
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
    renderer_classes = [JSONRenderer]

    def post(self, request, pk):
        try:
            draft = OpportunityDraft.objects.get(pk=pk)
        except OpportunityDraft.DoesNotExist:
            return Response({"detail": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            cleaned, warnings, errors = validate_opportunity_draft_payload(draft.raw_payload)
            opportunity = cleaned.get("opportunity", {})

            draft.confidence = cleaned.get("confidence", "")
            draft.source_url = opportunity.get("source_url", "")
            draft.source_name = opportunity.get("source_name", "")
            draft.validation_warnings = warnings
            draft.validation_errors = errors
            draft.status = (
                OpportunityDraft.Status.ERROR if errors else OpportunityDraft.Status.VALIDATED
            )

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
        except Exception:
            logger.exception("Admin opportunity draft validation failed.")
            return Response(
                {"detail": "Agent API request failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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


class AdminOpportunityDuplicateCheckView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        matches = find_duplicate_opportunities(request.data if isinstance(request.data, dict) else {})
        return Response({"matches": matches})


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


class AdminOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        today = timezone.localdate()
        soon = today + timedelta(days=30)

        scholarships = Opportunity.objects.filter(
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP
        )
        drafts = OpportunityDraft.objects.all()
        drafts_needing_review = drafts.filter(created_opportunity__isnull=True).exclude(
            status=OpportunityDraft.Status.IMPORTED
        )
        comments = OpportunityComment.objects.all()

        return Response(
            {
                "scholarships": {
                    "total": scholarships.count(),
                    "draft": scholarships.filter(status=Opportunity.Status.DRAFT).count(),
                    "published": scholarships.filter(status=Opportunity.Status.PUBLISHED).count(),
                    "archived": scholarships.filter(status=Opportunity.Status.ARCHIVED).count(),
                    "featured": scholarships.filter(featured=True).count(),
                    "unverified": scholarships.filter(verified_status=False).count(),
                    "expiring_soon": scholarships.filter(
                        status=Opportunity.Status.PUBLISHED,
                        is_rolling_deadline=False,
                        deadline__isnull=False,
                        deadline__gte=today,
                        deadline__lte=soon,
                    ).count(),
                },
                "drafts": {
                    "total": drafts.count(),
                    "needs_review": drafts_needing_review.count(),
                    "new": drafts.filter(status=OpportunityDraft.Status.NEW).count(),
                    "validated": drafts.filter(status=OpportunityDraft.Status.VALIDATED).count(),
                    "imported": drafts.filter(status=OpportunityDraft.Status.IMPORTED).count(),
                    "error": drafts.filter(status=OpportunityDraft.Status.ERROR).count(),
                },
                "comments": {
                    "pending": comments.filter(
                        moderation_status=OpportunityComment.ModerationStatus.PENDING
                    ).count(),
                    "active": comments.filter(
                        moderation_status=OpportunityComment.ModerationStatus.ACTIVE
                    ).count(),
                    "deleted": comments.filter(
                        moderation_status=OpportunityComment.ModerationStatus.DELETED
                    ).count(),
                },
                "students": {
                    "total": User.objects.filter(role=User.Role.STUDENT).count(),
                },
                "applications": {
                    "total": OpportunityApplication.objects.count(),
                    "saved": SavedOpportunity.objects.count(),
                },
            }
        )
