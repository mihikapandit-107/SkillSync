from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.skills.models import Skill, UserSkill
from .models import SwapRequest

User = get_user_model()


class SwapTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@x.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@x.com", "pass12345!")
        self.carol = User.objects.create_user("carol", "c@x.com", "pass12345!")

        self.python = Skill.objects.create(name="Python")
        self.guitar = Skill.objects.create(name="Guitar")

        UserSkill.objects.create(user=self.alice, skill=self.python, skill_type="offer")
        UserSkill.objects.create(user=self.bob, skill=self.guitar, skill_type="offer")

        self.payload = {
            "receiver": self.bob.id,
            "offered_skill": self.python.id,
            "wanted_skill": self.guitar.id,
            "message": "Swap?",
        }

    def create_swap(self):
        self.client.force_authenticate(self.alice)
        return self.client.post("/api/swaps/", self.payload, format="json")

    def test_unauthenticated_gets_401(self):
        self.assertEqual(self.client.get("/api/swaps/").status_code, 401)

    def test_create_swap(self):
        res = self.create_swap()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "pending")

    def test_cannot_swap_with_self(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/swaps/", {**self.payload, "receiver": self.alice.id}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cannot_offer_skill_you_do_not_have(self):
        self.client.force_authenticate(self.carol)
        res = self.client.post("/api/swaps/", self.payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("offered_skill", res.data)

    def test_receiver_must_offer_wanted_skill(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/swaps/", {**self.payload, "wanted_skill": self.python.id}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("wanted_skill", res.data)

    def test_duplicate_pending_blocked(self):
        self.create_swap()
        res = self.create_swap()
        self.assertEqual(res.status_code, 400)

    def test_receiver_can_accept(self):
        swap_id = self.create_swap().data["id"]
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/swaps/{swap_id}/accept/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "accepted")

    def test_requester_cannot_accept(self):
        swap_id = self.create_swap().data["id"]
        res = self.client.post(f"/api/swaps/{swap_id}/accept/")
        self.assertEqual(res.status_code, 403)

    def test_requester_can_cancel_receiver_cannot(self):
        swap_id = self.create_swap().data["id"]
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.post(f"/api/swaps/{swap_id}/cancel/").status_code, 403)
        self.client.force_authenticate(self.alice)
        res = self.client.post(f"/api/swaps/{swap_id}/cancel/")
        self.assertEqual(res.data["status"], "cancelled")

    def test_cannot_change_after_decision(self):
        swap_id = self.create_swap().data["id"]
        self.client.force_authenticate(self.bob)
        self.client.post(f"/api/swaps/{swap_id}/reject/")
        res = self.client.post(f"/api/swaps/{swap_id}/accept/")
        self.assertEqual(res.status_code, 400)

    def test_outsider_gets_404(self):
        swap_id = self.create_swap().data["id"]
        self.client.force_authenticate(self.carol)
        self.assertEqual(self.client.get(f"/api/swaps/{swap_id}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/swaps/{swap_id}/accept/").status_code, 404)

    def test_box_filter(self):
        self.create_swap()
        self.assertEqual(self.client.get("/api/swaps/?box=sent").data["count"], 1)
        self.assertEqual(self.client.get("/api/swaps/?box=received").data["count"], 0)