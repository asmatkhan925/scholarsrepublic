from rest_framework import serializers

from apps.reference_data.models import Country, StudyField


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



class StudyFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyField
        fields = (
            "id",
            "name",
            "slug",
            "category",
            "aliases",
            "display_order",
        )
