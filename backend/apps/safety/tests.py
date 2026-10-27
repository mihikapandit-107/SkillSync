from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.safety.models import Block, Report
from apps.safety.services import is_blocked_between, blocked_user_ids

User = get_user_model()

class SafetyTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@test.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@test.com", "pass12345!")
        self.admin = User.objects.create_superuser("admin", "admin@test.com", "pass12345!")

    def test_block_user_and_services(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/blocks/", {"blocked": self.bob.id}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(is_blocked_between(self.alice.id, self.bob.id))
        self.assertTrue(is_blocked_between(self.bob.id, self.alice.id))
        self.assertIn(self.bob.id, blocked_user_ids(self.alice))
        self.assertIn(self.alice.id, blocked_user_ids(self.bob))

        # Cannot block self
        res = self.client.post("/api/blocks/", {"blocked": self.alice.id}, format="json")
        self.assertEqual(res.status_code, 400)

        # Unblock
        del_res = self.client.delete(f"/api/blocks/{self.bob.id}/")
        self.assertEqual(del_res.status_code, 204)
        self.assertFalse(is_blocked_between(self.alice.id, self.bob.id))

    def test_report_and_admin_resolve(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/reports/", {
            "reported_user": self.bob.id,
            "reason": "spam",
            "details": "Sent inappropriate promotional spam."
        }, format="json")
        self.assertEqual(res.status_code, 201)
        report_id = res.data["id"]

        # Duplicate open report fails
        dup_res = self.client.post("/api/reports/", {
            "reported_user": self.bob.id,
            "reason": "harassment",
        }, format="json")
        self.assertEqual(dup_res.status_code, 400)

        # Non-staff cannot view admin reports
        admin_res = self.client.get("/api/admin/reports/")
        self.assertEqual(admin_res.status_code, 403)

        # Admin resolves report
        self.client.force_authenticate(self.admin)
        admin_res = self.client.get("/api/admin/reports/")
        self.assertEqual(admin_res.status_code, 200)
        self.assertEqual(admin_res.data["count"], 1)

        patch_res = self.client.patch(f"/api/admin/reports/{report_id}/", {
            "status": "resolved",
            "admin_note": "Warned user"
        }, format="json")
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data["status"], "resolved")
