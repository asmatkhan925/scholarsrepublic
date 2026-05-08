from rest_framework import serializers

from apps.applications.models import SavedOpportunity
from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import OpportunityListSerializer
from apps.users.models import User


class SavedOpportunitySerializer(serializers.ModelSerializer):
    opportunity_detail = OpportunityListSerializer(source="opportunity", read_only=True)

    class Meta:
        model = SavedOpportunity
        fields = (
            "id",
            "opportunity",
            "opportunity_detail",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "opportunity_detail",
            "created_at",
            "updated_at",
        )


class SavedOpportunityCreateSerializer(serializers.ModelSerializer):
    opportunity_id = serializers.IntegerField(required=False, write_only=True)
    opportunity_slug = serializers.SlugField(required=False, write_only=True)
    opportunity_detail = OpportunityListSerializer(source="opportunity", read_only=True)

    class Meta:
        model = SavedOpportunity
        fields = (
            "id",
            "opportunity",
            "opportunity_id",
            "opportunity_slug",
            "opportunity_detail",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "opportunity",
            "opportunity_detail",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        if user.role != User.Role.STUDENT:
            raise serializers.ValidationError(
                {"detail": "Only student users can save opportunities."}
            )

        opportunity_id = attrs.pop("opportunity_id", None)
        opportunity_slug = attrs.pop("opportunity_slug", None)
        if not opportunity_id and not opportunity_slug:
            raise serializers.ValidationError(
                {"detail": "Provide opportunity_id or opportunity_slug."}
            )

        lookup = {"id": opportunity_id} if opportunity_id else {"slug": opportunity_slug}
        try:
            opportunity = Opportunity.objects.get(**lookup)
        except Opportunity.DoesNotExist as exc:
            raise serializers.ValidationError({"detail": "Opportunity not found."}) from exc

        if opportunity.status != Opportunity.Status.PUBLISHED:
            raise serializers.ValidationError(
                {"detail": "Only published opportunities can be saved."}
            )

        if SavedOpportunity.objects.filter(user=user, opportunity=opportunity).exists():
            raise serializers.ValidationError({"detail": "Opportunity already saved."})

        attrs["opportunity"] = opportunity
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return SavedOpportunity.objects.create(user=request.user, **validated_data)
