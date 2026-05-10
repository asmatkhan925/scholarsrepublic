from django.db.models import Count, Q
from django.db.models import Prefetch
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.applications.serializers import (
    OpportunityApplicationCreateSerializer,
    OpportunityApplicationSerializer,
    OpportunityApplicationUpdateSerializer,
    SavedOpportunityCreateSerializer,
    SavedOpportunitySerializer,
)
from apps.opportunities.models import Opportunity
from apps.users.models import User


class IsStudentUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
        )


class SavedOpportunityListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get_queryset(self):
        return (
            SavedOpportunity.objects.filter(user=self.request.user)
            .select_related("opportunity", "user")
            .prefetch_related(
                Prefetch(
                    "application_trackers",
                    queryset=OpportunityApplication.objects.filter(user=self.request.user).only(
                        "id",
                        "saved_opportunity_id",
                    ),
                )
            )
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SavedOpportunityCreateSerializer
        return SavedOpportunitySerializer


class SavedOpportunityDetailView(generics.DestroyAPIView):
    serializer_class = SavedOpportunitySerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get_queryset(self):
        return SavedOpportunity.objects.filter(user=self.request.user).select_related(
            "opportunity", "user"
        )


class SavedOpportunitySlugsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get(self, request):
        saved = SavedOpportunity.objects.filter(user=request.user).select_related("opportunity")
        return Response(
            {
                "slugs": [item.opportunity.slug for item in saved],
                "ids": [item.opportunity.id for item in saved],
            }
        )


class OpportunityApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get_queryset(self):
        queryset = (
            OpportunityApplication.objects.filter(user=self.request.user)
            .select_related("opportunity", "saved_opportunity", "user")
            .order_by("-updated_at")
        )

        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        opportunity_type = self.request.query_params.get("opportunity_type")
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(priority=priority)
        if opportunity_type:
            queryset = queryset.filter(opportunity__opportunity_type=opportunity_type)
        if search:
            queryset = queryset.filter(
                Q(opportunity__title__icontains=search)
                | Q(opportunity__provider_name__icontains=search)
                | Q(opportunity__university_name__icontains=search)
                | Q(opportunity__company_name__icontains=search)
                | Q(opportunity__country__icontains=search)
                | Q(notes__icontains=search)
                | Q(next_step__icontains=search)
            )

        allowed_ordering = {
            "personal_deadline",
            "-personal_deadline",
            "updated_at",
            "-updated_at",
            "created_at",
            "-created_at",
            "status",
            "priority",
        }
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def get_serializer_class(self):
        if self.request.method == "POST":
            return OpportunityApplicationCreateSerializer
        return OpportunityApplicationSerializer


class OpportunityApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get_queryset(self):
        return OpportunityApplication.objects.filter(user=self.request.user).select_related(
            "opportunity", "saved_opportunity", "user"
        )

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return OpportunityApplicationUpdateSerializer
        return OpportunityApplicationSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(OpportunityApplicationSerializer(instance).data)


class ApplicationSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def get(self, request):
        queryset = OpportunityApplication.objects.filter(user=request.user).select_related(
            "opportunity", "saved_opportunity", "user"
        )
        raw_counts = queryset.values("status").annotate(count=Count("id"))
        counts_by_status = {choice.value: 0 for choice in OpportunityApplication.Status}
        counts_by_status.update({item["status"]: item["count"] for item in raw_counts})

        upcoming_deadlines = queryset.filter(personal_deadline__isnull=False).order_by(
            "personal_deadline", "-updated_at"
        )[:5]
        recently_updated = queryset.order_by("-updated_at")[:5]

        return Response(
            {
                "total": queryset.count(),
                "counts_by_status": counts_by_status,
                "upcoming_deadlines": OpportunityApplicationSerializer(
                    upcoming_deadlines,
                    many=True,
                ).data,
                "recently_updated": OpportunityApplicationSerializer(
                    recently_updated,
                    many=True,
                ).data,
            }
        )


class StartApplicationFromSavedView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]

    def post(self, request, pk):
        try:
            saved = SavedOpportunity.objects.select_related("opportunity").get(
                id=pk,
                user=request.user,
            )
        except SavedOpportunity.DoesNotExist:
            return Response(
                {"detail": "Saved opportunity not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if saved.opportunity.status != Opportunity.Status.PUBLISHED:
            return Response(
                {"detail": "Only published opportunities can be tracked."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application, created = OpportunityApplication.objects.get_or_create(
            user=request.user,
            opportunity=saved.opportunity,
            defaults={"saved_opportunity": saved},
        )
        if not application.saved_opportunity:
            application.saved_opportunity = saved
            application.save(update_fields=["saved_opportunity", "updated_at"])

        return Response(
            OpportunityApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class OpportunityStartApplicationView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]
    opportunity_type = None

    def get_opportunity(self, slug):
        queryset = Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
        if self.opportunity_type:
            queryset = queryset.filter(opportunity_type=self.opportunity_type)
        return queryset.get(slug=slug)

    def post(self, request, slug):
        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        saved, _ = SavedOpportunity.objects.get_or_create(
            user=request.user, opportunity=opportunity
        )
        application, created = OpportunityApplication.objects.get_or_create(
            user=request.user,
            opportunity=opportunity,
            defaults={"saved_opportunity": saved},
        )
        if not application.saved_opportunity:
            application.saved_opportunity = saved
            application.save(update_fields=["saved_opportunity", "updated_at"])

        return Response(
            OpportunityApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ScholarshipStartApplicationView(OpportunityStartApplicationView):
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP


class OpportunitySaveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]
    opportunity_type = None

    def get_opportunity(self, slug):
        queryset = Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
        if self.opportunity_type:
            queryset = queryset.filter(opportunity_type=self.opportunity_type)
        return queryset.get(slug=slug)

    def post(self, request, slug):
        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        saved, created = SavedOpportunity.objects.get_or_create(
            user=request.user,
            opportunity=opportunity,
            defaults={"notes": request.data.get("notes", "")},
        )
        serializer = SavedOpportunitySerializer(saved)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, slug):
        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = SavedOpportunity.objects.filter(
            user=request.user,
            opportunity=opportunity,
        ).delete()
        if not deleted:
            return Response(
                {"detail": "Saved opportunity not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ScholarshipSaveView(OpportunitySaveView):
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP
