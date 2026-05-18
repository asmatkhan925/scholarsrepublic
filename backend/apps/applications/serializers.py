from rest_framework import serializers

from apps.ai_tools.models import SOPDraft
from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import OpportunityListSerializer
from apps.users.models import User


class SavedOpportunitySerializer(serializers.ModelSerializer):
    opportunity_detail = OpportunityListSerializer(source="opportunity", read_only=True)
    application_id = serializers.SerializerMethodField()
    is_tracking = serializers.SerializerMethodField()

    class Meta:
        model = SavedOpportunity
        fields = (
            "id",
            "opportunity",
            "opportunity_detail",
            "notes",
            "application_id",
            "is_tracking",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "opportunity_detail",
            "application_id",
            "is_tracking",
            "created_at",
            "updated_at",
        )

    def get_application_id(self, obj):
        tracker = obj.application_trackers.first()
        return tracker.id if tracker else None

    def get_is_tracking(self, obj):
        return self.get_application_id(obj) is not None


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


def get_published_opportunity(attrs):
    opportunity_id = attrs.pop("opportunity_id", None)
    opportunity_slug = attrs.pop("opportunity_slug", None)
    if not opportunity_id and not opportunity_slug:
        return None

    lookup = {"id": opportunity_id} if opportunity_id else {"slug": opportunity_slug}
    try:
        opportunity = Opportunity.objects.get(**lookup)
    except Opportunity.DoesNotExist as exc:
        raise serializers.ValidationError({"detail": "Opportunity not found."}) from exc

    if opportunity.status != Opportunity.Status.PUBLISHED:
        raise serializers.ValidationError(
            {"detail": "Only published opportunities can be tracked."}
        )
    return opportunity


class OpportunityApplicationSerializer(serializers.ModelSerializer):
    opportunity_detail = OpportunityListSerializer(source="opportunity", read_only=True)
    latest_sop_draft = serializers.SerializerMethodField()
    required_documents = serializers.SerializerMethodField()

    class Meta:
        model = OpportunityApplication
        fields = (
            "id",
            "user",
            "opportunity",
            "opportunity_detail",
            "saved_opportunity",
            "status",
            "priority",
            "notes",
            "next_step",
            "reminder_at",
            "submitted_at",
            "decision_at",
            "personal_deadline",
            "checklist_snapshot",
            "latest_sop_draft",
            "required_documents",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "opportunity_detail",
            "saved_opportunity",
            "latest_sop_draft",
            "required_documents",
            "created_at",
            "updated_at",
        )
    def get_required_documents(self, obj):
        documents = obj.opportunity.required_documents or []
        if not isinstance(documents, list):
            return []
        return [str(document).strip() for document in documents if str(document).strip()]


    def get_latest_sop_draft(self, obj):
        base_queryset = SOPDraft.objects.filter(user_id=obj.user_id)

        draft = (
            base_queryset.filter(opportunity_id=obj.opportunity_id)
            .only("id", "title", "updated_at")
            .order_by("-updated_at")
            .first()
        )

        if not draft:
            draft = (
                base_queryset.filter(
                    opportunity__isnull=True,
                    target_scholarship__iexact=obj.opportunity.title,
                )
                .only("id", "title", "updated_at")
                .order_by("-updated_at")
                .first()
            )

        if not draft:
            return None

        return {
            "id": draft.id,
            "title": draft.title,
            "updated_at": draft.updated_at.isoformat() if draft.updated_at else "",
        }



class OpportunityApplicationCreateSerializer(serializers.ModelSerializer):
    opportunity_id = serializers.IntegerField(required=False, write_only=True)
    opportunity_slug = serializers.SlugField(required=False, write_only=True)
    saved_opportunity_id = serializers.IntegerField(required=False, write_only=True)
    opportunity_detail = OpportunityListSerializer(source="opportunity", read_only=True)

    class Meta:
        model = OpportunityApplication
        fields = (
            "id",
            "user",
            "opportunity",
            "opportunity_id",
            "opportunity_slug",
            "saved_opportunity",
            "saved_opportunity_id",
            "opportunity_detail",
            "status",
            "priority",
            "notes",
            "next_step",
            "reminder_at",
            "submitted_at",
            "decision_at",
            "personal_deadline",
            "checklist_snapshot",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "opportunity",
            "saved_opportunity",
            "opportunity_detail",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        if user.role != User.Role.STUDENT:
            raise serializers.ValidationError(
                {"detail": "Only student users can track applications."}
            )

        saved_opportunity_id = attrs.pop("saved_opportunity_id", None)
        opportunity = None
        saved_opportunity = None

        if saved_opportunity_id:
            try:
                saved_opportunity = SavedOpportunity.objects.get(
                    id=saved_opportunity_id,
                    user=user,
                )
            except SavedOpportunity.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"detail": "Saved opportunity not found."}
                ) from exc
            opportunity = saved_opportunity.opportunity
            if opportunity.status != Opportunity.Status.PUBLISHED:
                raise serializers.ValidationError(
                    {"detail": "Only published opportunities can be tracked."}
                )
        else:
            opportunity = get_published_opportunity(attrs)

        if not opportunity:
            raise serializers.ValidationError(
                {"detail": "Provide opportunity_id, opportunity_slug, or saved_opportunity_id."}
            )

        if OpportunityApplication.objects.filter(user=user, opportunity=opportunity).exists():
            raise serializers.ValidationError(
                {"detail": "You are already tracking this opportunity."}
            )

        checklist_snapshot = attrs.get("checklist_snapshot")
        if checklist_snapshot is not None and not isinstance(checklist_snapshot, list):
            raise serializers.ValidationError({"checklist_snapshot": "Must be a list."})

        if not saved_opportunity:
            saved_opportunity, _ = SavedOpportunity.objects.get_or_create(
                user=user,
                opportunity=opportunity,
            )

        attrs["opportunity"] = opportunity
        attrs["saved_opportunity"] = saved_opportunity
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return OpportunityApplication.objects.create(user=request.user, **validated_data)


class OpportunityApplicationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityApplication
        fields = (
            "status",
            "priority",
            "notes",
            "next_step",
            "reminder_at",
            "submitted_at",
            "decision_at",
            "personal_deadline",
            "checklist_snapshot",
        )

    def validate_checklist_snapshot(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list.")
        return value
