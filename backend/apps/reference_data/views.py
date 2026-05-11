from collections import OrderedDict

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reference_data.models import Country, StudyField
from apps.reference_data.serializers import CountrySerializer, StudyFieldSerializer


class CountryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        countries = (
            Country.objects.filter(is_active=True, region__is_active=True)
            .select_related("region")
            .order_by("region__display_order", "display_order", "name")
        )

        serializer = CountrySerializer(countries, many=True)
        regions = OrderedDict()

        for country in serializer.data:
            regions.setdefault(country["region"], []).append(country["name"])

        return Response(
            {
                "count": countries.count(),
                "results": serializer.data,
                "regions": regions,
            }
        )


class StudyFieldListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        fields = (
            StudyField.objects.filter(is_active=True, category__is_active=True)
            .select_related("category")
            .order_by("category__display_order", "display_order", "name")
        )

        serializer = StudyFieldSerializer(fields, many=True)
        categories = OrderedDict()

        for field in serializer.data:
            categories.setdefault(field["category"], []).append(field["name"])

        return Response(
            {
                "count": fields.count(),
                "results": serializer.data,
                "categories": categories,
            }
        )
