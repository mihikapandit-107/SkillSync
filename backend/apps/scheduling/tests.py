from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.skills.models import Skill
from apps.swaps.models import SwapRequest
from .models import Session

User = get_user_model()


class SessionTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@x.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@x.com", "pass12345!")
        self.carol = User.objects.create_user("carol", "c@x.com", "pass12345!")
        python = Skill.objects.create(name="Python")
        guitar = Skill.objects.create(name="Guitar")

        self.swap = SwapRequest.objects.create(
            requester=self.alice, receiver=self.bob,
            offered_skill=python, wanted_skill=guitar, status="accepted",
        )
        self.pending_swap = SwapRequest.objects.create(
            requester=self.alice, receiver=self.carol,
            offered_skill=python, wanted_skill=guitar, status="pending",
        )
        self.start = timezone.now() + timedelta(days=2)

    def payload(self, **overrides):
        data = {
            "swap": self.swap.id,
            "scheduled_at": self.start.isoformat(),
            "duration_minutes": 60,
            "mode": "online",
            "location_or_link": "https://meet.example.com/abc",
        }
        data.update(overrides)
        return data

    def create(self, user=None, **overrides):
        self.client.force_authenticate(user or self.alice)
        return self.client.post("/api/sessions/", self.payload(**overrides), format="json")

    def test_unauthenticated_gets_401(self):
        self.assertEqual(self.client.get("/api/sessions/").status_code, 401)

    def test_participant_can_schedule(self):
        res = self.create()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "scheduled")
        self.assertEqual(res.data["created_by"], self.alice.id)

    def test_receiver_can_also_schedule(self):
        self.assertEqual(self.create(user=self.bob).status_code, 201)

    def test_outsider_cannot_schedule(self):
        res = self.create(user=self.carol)
        self.assertEqual(res.status_code, 400)
        self.assertIn("swap", res.data)

    def test_requires_accepted_swap(self):
        res = self.create(swap=self.pending_swap.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn("swap", res.data)

    def test_past_time_rejected(self):
        res = self.create(scheduled_at=(timezone.now() - timedelta(hours=1)).isoformat())
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_at", res.data)

    def test_location_required(self):
        res = self.create(location_or_link="")
        self.assertEqual(res.status_code, 400)
        self.assertIn("location_or_link", res.data)

    def test_duration_limits(self):
        self.assertEqual(self.create(duration_minutes=5).status_code, 400)
        self.assertEqual(self.create(duration_minutes=500).status_code, 400)

    def test_overlap_rejected(self):
        self.assertEqual(self.create().status_code, 201)
        res = self.create(scheduled_at=(self.start + timedelta(minutes=30)).isoformat())
        self.assertEqual(res.status_code, 400)
        # back-to-back is fine
        res = self.create(scheduled_at=(self.start + timedelta(minutes=60)).isoformat())
        self.assertEqual(res.status_code, 201)

    def test_reschedule(self):
        sid = self.create().data["id"]
        new_start = (self.start + timedelta(days=1)).isoformat()
        self.client.force_authenticate(self.bob)
        res = self.client.patch(f"/api/sessions/{sid}/", {"scheduled_at": new_start}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_cannot_change_swap_on_update(self):
        sid = self.create().data["id"]
        res = self.client.patch(f"/api/sessions/{sid}/", {"swap": self.pending_swap.id}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_outsider_gets_404(self):
        sid = self.create().data["id"]
        self.client.force_authenticate(self.carol)
        self.assertEqual(self.client.get(f"/api/sessions/{sid}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/sessions/{sid}/cancel/").status_code, 404)

    def test_cancel_and_no_changes_afterwards(self):
        sid = self.create().data["id"]
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/sessions/{sid}/cancel/")
        self.assertEqual(res.data["status"], "cancelled")
        self.assertEqual(res.data["cancelled_by"], self.bob.id)
        self.assertEqual(self.client.post(f"/api/sessions/{sid}/cancel/").status_code, 400)
        res = self.client.patch(f"/api/sessions/{sid}/", {"notes": "x"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cannot_complete_future_session(self):
        sid = self.create().data["id"]
        self.assertEqual(self.client.post(f"/api/sessions/{sid}/complete/").status_code, 400)

    def test_complete_after_start(self):
        past = Session.objects.create(
            swap=self.swap, scheduled_at=timezone.now() - timedelta(hours=2),
            location_or_link="Library", created_by=self.alice,
        )
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/sessions/{past.id}/complete/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "completed")

    def test_filters(self):
        self.create()
        self.assertEqual(self.client.get("/api/sessions/?status=scheduled").data["count"], 1)
        self.assertEqual(self.client.get("/api/sessions/?status=cancelled").data["count"], 0)
        self.assertEqual(self.client.get("/api/sessions/?upcoming=true").data["count"], 1)
        self.assertEqual(self.client.get("/api/sessions/?status=bogus").status_code, 400)
        self.assertEqual(self.client.get("/api/sessions/?swap=abc").status_code, 400)

    def test_notifications_are_sent(self):
        sid = self.create().data["id"]
        self.assertEqual(
            Notification.objects.filter(recipient=self.bob, notification_type="session_scheduled").count(), 1
        )
        self.client.force_authenticate(self.bob)
        self.client.post(f"/api/sessions/{sid}/cancel/")
        self.assertEqual(
            Notification.objects.filter(recipient=self.alice, notification_type="session_cancelled").count(), 1
        )