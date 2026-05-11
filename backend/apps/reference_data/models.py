from django.db import models
from django.utils.text import slugify


class Region(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    code = models.CharField(max_length=40, unique=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=1000, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("display_order", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        if not self.code:
            self.code = slugify(self.name).replace("-", "_").upper()

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Country(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    region = models.ForeignKey(
        "reference_data.Region",
        on_delete=models.PROTECT,
        related_name="countries",
    )
    iso2 = models.CharField(max_length=2, blank=True, db_index=True)
    iso3 = models.CharField(max_length=3, blank=True)
    calling_code = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=1000, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("region__display_order", "display_order", "name")
        indexes = [
            models.Index(fields=["region", "is_active"]),
            models.Index(fields=["is_active", "display_order"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["iso2"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        self.iso2 = self.iso2.upper()
        self.iso3 = self.iso3.upper()

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class StudyFieldCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=1000, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("display_order", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class StudyField(models.Model):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    category = models.ForeignKey(
        "reference_data.StudyFieldCategory",
        on_delete=models.PROTECT,
        related_name="study_fields",
    )
    aliases = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=1000, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("category__display_order", "display_order", "name")
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["is_active", "display_order"]),
            models.Index(fields=["slug"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name
