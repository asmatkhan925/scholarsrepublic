from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai_tools.models import SOPDraft
from apps.users.models import User


class SOPDraftAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sop-owner@example.com",
            password="StrongPassword123!",
            full_name="SOP Owner",
        )
        self.other_user = User.objects.create_user(
            email="sop-other@example.com",
            password="StrongPassword123!",
            full_name="SOP Other",
        )
        self.list_url = reverse("ai-sop-draft-list")

    def draft_payload(self, **overrides):
        payload = {
            "title": "CSC SOP Draft",
            "provider": SOPDraft.Provider.LOCAL,
            "provider_label": "Server 1",
            "target_scholarship": "Chinese Government Scholarship",
            "target_country": "China",
            "target_degree": "Master's",
            "field_of_study": "Computer Science",
            "academic_background": "BS Computer Science",
            "key_strength": "Final year project in AI",
            "why_this_scholarship": "It fits my academic goals.",
            "future_goal": "I want to contribute to education technology.",
            "contribution_goal": "Build useful tools for students.",
            "notes": "Use a sincere tone.",
            "sop_text": "This is a complete SOP draft.\n\nIt has clear paragraphs.",
        }
        payload.update(overrides)
        return payload

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.post(self.list_url, self.draft_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_create_own_sop_draft(self):
        self.authenticate()

        response = self.client.post(self.list_url, self.draft_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "CSC SOP Draft")
        self.assertEqual(response.data["provider"], SOPDraft.Provider.LOCAL)
        self.assertEqual(response.data["provider_label"], "Server 1")
        self.assertEqual(SOPDraft.objects.get().user, self.user)

    def test_empty_sop_text_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            self.list_url,
            self.draft_payload(sop_text="   "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sop_text", response.data)

    def test_backend_generates_title_when_missing(self):
        self.authenticate()

        response = self.client.post(
            self.list_url,
            self.draft_payload(title=""),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "SOP Draft - Chinese Government Scholarship")

    def test_user_can_list_only_own_drafts(self):
        SOPDraft.objects.create(
            user=self.user,
            title="Own draft",
            provider=SOPDraft.Provider.PUTER,
            provider_label="Server 2",
            sop_text="Own SOP text.",
        )
        SOPDraft.objects.create(
            user=self.other_user,
            title="Other draft",
            provider=SOPDraft.Provider.DEEPSEEK,
            provider_label="Server 3",
            sop_text="Other SOP text.",
        )
        self.authenticate()

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Own draft")

    def test_user_cannot_view_another_users_draft(self):
        other_draft = SOPDraft.objects.create(
            user=self.other_user,
            title="Other draft",
            provider=SOPDraft.Provider.LOCAL,
            provider_label="Server 1",
            sop_text="Other SOP text.",
        )
        self.authenticate()

        response = self.client.get(reverse("ai-sop-draft-detail", args=[other_draft.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_delete_own_draft(self):
        draft = SOPDraft.objects.create(
            user=self.user,
            title="Own draft",
            provider=SOPDraft.Provider.LOCAL,
            provider_label="Server 1",
            sop_text="Own SOP text.",
        )
        self.authenticate()

        response = self.client.delete(reverse("ai-sop-draft-detail", args=[draft.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SOPDraft.objects.filter(id=draft.id).exists())
