from rest_framework import serializers

from apps.reference_data.models import Country


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = (
            "id",
            "name",
            "slug",
            "region",
            "iso2",
            "iso3",
            "calling_code",
            "display_order",
        )
