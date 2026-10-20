from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.scheduling.models import Session
from apps.skills.models import Skill
from apps.swaps.models import SwapRequest
from .models import Review

User = get_user_model()


class ReviewTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@x.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@x.com", "pass12345!")
        self.carol = User.objects.create_user("carol", "c@x.com", "pass12345!")
        python = Skill.objects.create(name="Python")
        guitar = Skill.objects.create(name="Guitar")
        swap = SwapRequest.objects.create(
            requester=self.alice, receiver=self.bob,
            offered_skill=python, wanted_skill=guitar, status="accepted",
        )
        self.done = Session.objects.create(
            swap=swap, scheduled_at=timezone.now() - timedelta(days=1),
            location_or_link="Library", status="completed", created_by=self.alice,
        )
        self.upcoming = Session.objects.create(
            swap=swap, scheduled_at=timezone.now() + timedelta(days=3),
            location_or_link="Library", created_by=self.alice,
        )

    def review(self, user, session=None, rating=5, **extra):
        self.client.force_authenticate(user)
        data = {"session": (session or self.done).id, "rating": rating, "comment": "Great"}
        data.update(extra)
        return self.client.post("/api/reviews/", data, format="json")

    def test_unauthenticated_gets_401(self):
        self.assertEqual(self.client.get("/api/reviews/").status_code, 401)

    def test_participant_reviews_other_participant(self):
        res = self.review(self.alice)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["reviewee_detail"]["username"], "bob")
        self.assertEqual(res.data["reviewer_detail"]["username"], "alice")

    def test_receiver_reviews_requester(self):
        res = self.review(self.bob)
        self.assertEqual(res.data["reviewee_detail"]["username"], "alice")

    def test_client_cannot_choose_reviewee(self):
        res = self.review(self.alice, reviewee=self.carol.id)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["reviewee_detail"]["username"], "bob")

    def test_outsider_cannot_review(self):
        res = self.review(self.carol)
        self.assertEqual(res.status_code, 400)
        self.assertIn("session", res.data)

    def test_session_must_be_completed(self):
        res = self.review(self.alice, session=self.upcoming)
        self.assertEqual(res.status_code, 400)
        self.assertIn("session", res.data)

    def test_one_review_per_session_per_reviewer(self):
        self.review(self.alice)
        self.assertEqual(self.review(self.alice).status_code, 400)
        self.assertEqual(self.review(self.bob).status_code, 201)

    def test_rating_bounds(self):
        self.assertEqual(self.review(self.alice, rating=0).status_code, 400)
        self.assertEqual(self.review(self.alice, rating=6).status_code, 400)
        self.assertEqual(Review.objects.count(), 0)

    def test_list_filters(self):
        self.review(self.alice, rating=4)
        self.review(self.bob, rating=5)
        self.assertEqual(self.client.get(f"/api/reviews/?user={self.bob.id}").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/reviews/?session={self.done.id}").data["count"], 2)
        self.assertEqual(self.client.get("/api/reviews/?given=true").data["count"], 1)
        self.assertEqual(self.client.get("/api/reviews/?user=abc").status_code, 400)

    def test_pending_reviews(self):
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.get("/api/reviews/pending/").data["count"], 1)
        self.review(self.alice)
        self.assertEqual(self.client.get("/api/reviews/pending/").data["count"], 0)
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.get("/api/reviews/pending/").data["count"], 1)
        self.client.force_authenticate(self.carol)
        self.assertEqual(self.client.get("/api/reviews/pending/").data["count"], 0)

    def test_students_cannot_edit_or_delete(self):
        rid = self.review(self.alice).data["id"]
        self.assertEqual(self.client.patch(f"/api/reviews/{rid}/", {"rating": 1}, format="json").status_code, 405)
        self.assertEqual(self.client.delete(f"/api/reviews/{rid}/").status_code, 405)

    def test_profile_shows_average_rating(self):
        self.review(self.alice, rating=5)
        self.client.force_authenticate(self.carol)
        # bob has one 5-star review so far
        res = self.client.get(f"/api/users/{self.bob.id}/")
        self.assertEqual((res.data["average_rating"], res.data["review_count"]), (5.0, 1))
        self.client.force_authenticate(self.bob)
        me = self.client.get("/api/users/me/")
        self.assertEqual(me.data["review_count"], 1)
        # nobody has reviewed carol
        self.client.force_authenticate(self.alice)
        res = self.client.get(f"/api/users/{self.carol.id}/")
        self.assertEqual((res.data["average_rating"], res.data["review_count"]), (None, 0))

    def test_notification_sent_to_reviewee(self):
        self.review(self.alice, rating=4)
        n = Notification.objects.get(recipient=self.bob, notification_type="review_received")
        self.assertIn("4/5", n.message)