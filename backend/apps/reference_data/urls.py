from django.urls import path

from apps.reference_data.views import CountryListView

urlpatterns = [
    path("countries/", CountryListView.as_view(), name="country-list"),
]
