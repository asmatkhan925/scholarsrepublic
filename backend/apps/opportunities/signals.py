from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.opportunities.models import Opportunity
from apps.reference_data.models import Country, Region, StudyField


def clean_pending_list(value):
    if value in (None, ""):
        return []

    if not isinstance(value, list):
        return []

    cleaned = []
    seen = set()

    for item in value:
        if not isinstance(item, str):
            continue

        item = item.strip()

        if not item:
            continue

        key = item.casefold()

        if key not in seen:
            cleaned.append(item)
            seen.add(key)

    return cleaned


@receiver(post_save, sender=Opportunity)
def apply_pending_opportunity_reference_lists(sender, instance, **kwargs):
    if not instance.pk:
        return

    if hasattr(instance, "_pending_eligible_countries"):
        country_names = clean_pending_list(instance._pending_eligible_countries)
        countries = Country.objects.filter(is_active=True, name__in=country_names)
        instance.eligible_country_refs.set(countries)
        delattr(instance, "_pending_eligible_countries")

    if hasattr(instance, "_pending_target_regions"):
        region_names = clean_pending_list(instance._pending_target_regions)
        regions = Region.objects.filter(is_active=True, name__in=region_names)
        instance.eligible_region_refs.set(regions)
        delattr(instance, "_pending_target_regions")

    if hasattr(instance, "_pending_fields_of_study"):
        field_names = clean_pending_list(instance._pending_fields_of_study)
        normalized_names = {name.casefold() for name in field_names}

        if {"all fields", "all", "any"} & normalized_names:
            Opportunity.objects.filter(pk=instance.pk).update(all_study_fields=True)
            instance.all_study_fields = True
            instance.study_field_refs.clear()
        else:
            fields = StudyField.objects.filter(is_active=True, name__in=field_names)
            instance.study_field_refs.set(fields)

            if instance.all_study_fields:
                Opportunity.objects.filter(pk=instance.pk).update(all_study_fields=False)
                instance.all_study_fields = False

        delattr(instance, "_pending_fields_of_study")
