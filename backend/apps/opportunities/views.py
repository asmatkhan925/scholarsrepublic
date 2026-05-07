from django.db.models import F, Q
from rest_framework import generics, permissions

from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import (
    OpportunityAdminSerializer,
    OpportunityDetailSerializer,
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
            queryset = queryset.filter(country__iexact=country)

        degree_level = params.get("degree_level")
        if degree_level:
            queryset = queryset.filter(degree_levels__contains=[degree_level])

        field = params.get("field")
        if field:
            queryset = queryset.filter(
                Q(fields_of_study__contains=[field]) | Q(fields_of_study__contains=["All Fields"])
            )

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
                | Q(country__icontains=search)
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
        return Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)


class PublicOpportunityDetailView(generics.RetrieveAPIView):
    serializer_class = OpportunityDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)


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
