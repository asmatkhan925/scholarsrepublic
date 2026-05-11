from collections import OrderedDict

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reference_data.models import Country
from apps.reference_data.serializers import CountrySerializer


class CountryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        countries = Country.objects.filter(is_active=True).order_by(
            "region",
            "display_order",
            "name",
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
