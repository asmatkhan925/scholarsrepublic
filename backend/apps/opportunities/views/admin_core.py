"""
Admin CRUD views: opportunities, drafts, pathways, overview, comments, students, applications.
"""
import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.profiles.models import StudentProfile
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


class AdminStudentProfileListView(APIView):
    """GET /admin/students/profiles/ — paginated student profile overview."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = (
            StudentProfile.objects.select_related("user")
            .only(
                "user__id", "user__email", "user__full_name", "user__created_at", "user__is_active",
                "current_education_level", "current_institution", "graduation_year",
                "profile_source", "ai_autofill_reviewed",
            )
            .order_by("user__full_name")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search) | Q(user__full_name__icontains=search)
            )

        readiness = request.query_params.get("readiness", "")
        # Can't filter in DB on a Python property — filter in Python after slicing
        # Use pagination then post-filter for readiness (small dataset)

        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = int(request.query_params.get("offset", 0))
        except ValueError:
            limit, offset = 50, 0

        all_profiles = list(qs)
        # Post-filter by readiness (computed property)
        if readiness in ("High", "Medium", "Low"):
            all_profiles = [p for p in all_profiles if p.readiness_level == readiness]

        total = len(all_profiles)
        page = all_profiles[offset: offset + limit]

        data = [
            {
                "user_id": p.user_id,
                "email": p.user.email,
                "full_name": p.user.full_name,
                "is_active": p.user.is_active,
                "joined": p.user.created_at.isoformat(),
                "completion_percentage": p.completion_percentage,
                "scholarship_readiness_score": p.scholarship_readiness_score,
                "readiness_level": p.readiness_level,
                "current_education_level": p.current_education_level,
                "current_institution": p.current_institution or "",
                "missing_count": len(p.missing_profile_fields) + len(p.missing_core_documents),
            }
            for p in page
        ]
        return Response({"count": total, "results": data})


class AdminApplicationListView(APIView):
    """GET /admin/applications/ — paginated cross-user application list."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = (
            OpportunityApplication.objects.select_related(
                "user", "opportunity", "opportunity__country_ref"
            )
            .order_by("-updated_at")
        )

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(user__full_name__icontains=search)
                | Q(opportunity__title__icontains=search)
            )

        user_id = parse_positive_int(request.query_params.get("user_id"))
        if user_id:
            qs = qs.filter(user_id=user_id)

        app_status = request.query_params.get("status", "")
        if app_status:
            qs = qs.filter(status=app_status)

        priority = request.query_params.get("priority", "")
        if priority:
            qs = qs.filter(priority=priority)

        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = int(request.query_params.get("offset", 0))
        except ValueError:
            limit, offset = 50, 0

        total = qs.count()
        apps = qs[offset: offset + limit]

        data = [
            {
                "id": a.pk,
                "user_id": a.user_id,
                "user_email": a.user.email,
                "user_name": a.user.full_name,
                "opportunity_id": a.opportunity_id,
                "opportunity_title": a.opportunity.title,
                "opportunity_deadline": (
                    a.opportunity.deadline.isoformat() if a.opportunity.deadline else None
                ),
                "country": (
                    a.opportunity.country_ref.name if a.opportunity.country_ref else a.opportunity.country
                ),
                "status": a.status,
                "priority": a.priority,
                "created_at": a.created_at.isoformat(),
                "updated_at": a.updated_at.isoformat(),
            }
            for a in apps
        ]
        return Response({"count": total, "results": data})


class AdminAnalyticsView(APIView):
    """GET /admin/analytics/ — platform-wide analytics snapshot."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        today = timezone.localdate()
        thirty_days_ago = today - timedelta(days=29)
        User = get_user_model()

        # --- Signups per day (last 30 days) ---
        signup_qs = (
            User.objects.filter(created_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        # Fill in zeros for days with no signups
        signup_map = {r["day"]: r["count"] for r in signup_qs}
        signups_series = []
        for i in range(30):
            d = thirty_days_ago + timedelta(days=i)
            signups_series.append({"date": d.isoformat(), "count": signup_map.get(d, 0)})

        # --- Applications per day (last 30 days) ---
        app_qs = (
            OpportunityApplication.objects.filter(created_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        app_map = {r["day"]: r["count"] for r in app_qs}
        apps_series = []
        for i in range(30):
            d = thirty_days_ago + timedelta(days=i)
            apps_series.append({"date": d.isoformat(), "count": app_map.get(d, 0)})

        # --- Application status breakdown ---
        status_qs = (
            OpportunityApplication.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        status_breakdown = [{"status": r["status"], "count": r["count"]} for r in status_qs]

        # --- Top 10 scholarships by applications ---
        top_scholarships = (
            OpportunityApplication.objects.values(
                "opportunity__id", "opportunity__title"
            )
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        top_scholarships_data = [
            {
                "id": r["opportunity__id"],
                "title": r["opportunity__title"],
                "count": r["count"],
            }
            for r in top_scholarships
        ]

        # --- Profile readiness distribution ---
        from apps.profiles.models import StudentProfile
        all_profiles = StudentProfile.objects.select_related("user").only("user__id")
        readiness_counts = {"High": 0, "Medium": 0, "Low": 0}
        for p in all_profiles:
            level = p.readiness_level
            if level in readiness_counts:
                readiness_counts[level] += 1

        # --- Top countries ---
        top_countries = (
            OpportunityApplication.objects.exclude(
                Q(opportunity__country__isnull=True) | Q(opportunity__country="")
            )
            .values("opportunity__country")
            .annotate(count=Count("id"))
            .order_by("-count")[:8]
        )
        top_countries_data = [
            {"country": r["opportunity__country"], "count": r["count"]}
            for r in top_countries
        ]

        # --- Summary totals ---
        return Response({
            "summary": {
                "total_users": User.objects.count(),
                "total_students": User.objects.filter(role=User.Role.STUDENT).count(),
                "new_users_30d": User.objects.filter(created_at__date__gte=thirty_days_ago).count(),
                "total_applications": OpportunityApplication.objects.count(),
                "new_applications_30d": OpportunityApplication.objects.filter(
                    created_at__date__gte=thirty_days_ago
                ).count(),
                "total_profiles": all_profiles.count(),
                "published_scholarships": Opportunity.objects.filter(
                    status=Opportunity.Status.PUBLISHED
                ).count(),
            },
            "signups_series": signups_series,
            "apps_series": apps_series,
            "status_breakdown": status_breakdown,
            "top_scholarships": top_scholarships_data,
            "readiness_distribution": readiness_counts,
            "top_countries": top_countries_data,
        })
