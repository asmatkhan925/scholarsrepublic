from django.urls import path

from apps.reference_data.views import CountryListView, StudyFieldListView

urlpatterns = [
    path("countries/", CountryListView.as_view(), name="country-list"),
    path("study-fields/", StudyFieldListView.as_view(), name="study-field-list"),
]
