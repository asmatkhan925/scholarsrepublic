from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.applications.models import SavedOpportunity
from apps.applications.serializers import (
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
