from datetime import time
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.availability.models import AvailabilitySlot
from apps.availability.services import common_windows

User = get_user_model()

class AvailabilityTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@test.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@test.com", "pass12345!")

    def test_availability_crud_and_common_windows(self):
        self.client.force_authenticate(self.alice)

        # Create slot: Monday 14:00 - 16:00
        res = self.client.post("/api/availability/", {
            "weekday": 0,
            "start_time": "14:00",
            "end_time": "16:00"
        }, format="json")
        self.assertEqual(res.status_code, 201)
        slot_id = res.data["id"]

        # Overlapping slot on Monday should fail
        overlap_res = self.client.post("/api/availability/", {
            "weekday": 0,
            "start_time": "15:00",
            "end_time": "17:00"
        }, format="json")
        self.assertEqual(overlap_res.status_code, 400)

        # Bob creates slot: Monday 15:00 - 18:00
        AvailabilitySlot.objects.create(
            user=self.bob,
            weekday=0,
            start_time=time(15, 0),
            end_time=time(18, 0)
        )

        # Check common availability between Alice and Bob
        comm_res = self.client.get(f"/api/availability/common/{self.bob.id}/?min_minutes=30")
        self.assertEqual(comm_res.status_code, 200)
        windows = comm_res.data["windows"]
        self.assertEqual(len(windows), 1)
        self.assertEqual(windows[0]["start_time"], "15:00")
        self.assertEqual(windows[0]["end_time"], "16:00")
        self.assertEqual(windows[0]["minutes"], 60)

        # Delete slot
        del_res = self.client.delete(f"/api/availability/{slot_id}/")
        self.assertEqual(del_res.status_code, 204)
        self.assertEqual(AvailabilitySlot.objects.filter(user=self.alice).count(), 0)
