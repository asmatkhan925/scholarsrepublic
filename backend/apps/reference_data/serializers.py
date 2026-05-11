from rest_framework import serializers

from apps.reference_data.models import Country, Region, StudyField, StudyFieldCategory


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = (
            "id",
            "name",
            "slug",
            "code",
            "display_order",
        )


class CountrySerializer(serializers.ModelSerializer):
    region = serializers.CharField(source="region.name", read_only=True)
    region_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Country
        fields = (
            "id",
            "name",
            "slug",
            "region",
            "region_id",
            "iso2",
            "iso3",
            "calling_code",
            "display_order",
        )


class StudyFieldCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyFieldCategory
        fields = (
            "id",
            "name",
            "slug",
            "display_order",
        )


class StudyFieldSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = StudyField
        fields = (
            "id",
            "name",
            "slug",
            "category",
            "category_id",
            "aliases",
            "display_order",
        )
