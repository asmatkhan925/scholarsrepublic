from django.urls import path

from apps.profiles.views import (
    CVAutofillApplyView,
    CVAutofillExtractView,
    CVDownloadView,
    ProfileCompletionView,
    StudentProfileView,
)

urlpatterns = [
    path("", StudentProfileView.as_view(), name="student-profile"),
    path("completion/", ProfileCompletionView.as_view(), name="profile-completion"),
    path("cv/download/", CVDownloadView.as_view(), name="cv-download"),
    path("cv/autofill/extract/", CVAutofillExtractView.as_view(), name="cv-autofill-extract"),
    path("cv/autofill/apply/", CVAutofillApplyView.as_view(), name="cv-autofill-apply"),
]
