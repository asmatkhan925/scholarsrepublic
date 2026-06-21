from django.urls import path

from apps.profiles.views import CVDownloadView, ProfileCompletionView, StudentProfileView

urlpatterns = [
    path("", StudentProfileView.as_view(), name="student-profile"),
    path("completion/", ProfileCompletionView.as_view(), name="profile-completion"),
    path("cv/download/", CVDownloadView.as_view(), name="cv-download"),
]
