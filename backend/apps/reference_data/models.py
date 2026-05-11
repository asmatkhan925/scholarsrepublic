from django.db import models
from django.utils.text import slugify


class Country(models.Model):
    class Region(models.TextChoices):
        ASIA = "Asia", "Asia"
        EUROPE = "Europe", "Europe"
        MIDDLE_EAST = "Middle East", "Middle East"
        AFRICA = "Africa", "Africa"
        NORTH_AMERICA = "North America", "North America"
        LATIN_AMERICA = "Latin America", "Latin America"
        OCEANIA = "Oceania", "Oceania"
        OTHER = "Other", "Other"

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    region = models.CharField(max_length=40, choices=Region.choices, db_index=True)
    iso2 = models.CharField(max_length=2, blank=True, db_index=True)
    iso3 = models.CharField(max_length=3, blank=True)
    calling_code = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=1000, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("region", "display_order", "name")
        indexes = [
            models.Index(fields=["region", "is_active"]),
            models.Index(fields=["is_active", "display_order"]),
            models.Index(fields=["slug"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name
