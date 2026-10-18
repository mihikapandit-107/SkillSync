from types import SimpleNamespace
from unittest import mock

from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from . import signals
from .models import Notification
from .services import notify

User = get_user_model()
T = Notification.Type


def make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@ex.com", password="pass12345!")


class NotifyServiceTests(TestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")

    def test_creates_notification(self):
        n = notify(self.alice, T.SYSTEM, "Hello", actor=self.bob, target_type="swap", target_id=3)
        self.assertIsNotNone(n)
        self.assertEqual((n.recipient, n.actor, n.target_type, n.target_id, n.is_read),
                         (self.alice, self.bob, "swap", 3, False))

    def test_skips_self_notifications(self):
        self.assertIsNone(notify(self.alice, T.SYSTEM, "me", actor=self.alice))
        self.assertEqual(Notification.objects.count(), 0)

    def test_never_raises_on_failure(self):
        with mock.patch.object(Notification.objects, "create", side_effect=RuntimeError("db down")), \
                self.assertLogs("apps.notifications.services", level="ERROR"):
            self.assertIsNone(notify(self.alice, T.SYSTEM, "x"))

    def test_truncates_long_message(self):
        n = notify(self.alice, T.SYSTEM, "x" * 400)
        self.assertEqual(len(n.message), 255)


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.a1 = notify(self.alice, T.SWAP_REQUESTED, "req", actor=self.bob)
        self.a2 = notify(self.alice, T.SYSTEM, "sys")
        self.a3 = notify(self.alice, T.SYSTEM, "old")
        self.a3.is_read = True
        self.a3.save()
        self.b1 = notify(self.bob, T.SYSTEM, "bob's")
        self.client.force_authenticate(self.alice)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(None)
        for method, url in [
            ("get", reverse("notification-list")),
            ("get", reverse("notification-unread-count")),
            ("post", reverse("notification-read-all")),
            ("post", reverse("notification-read", args=[self.a1.pk])),
            ("delete", reverse("notification-detail", args=[self.a1.pk])),
        ]:
            self.assertEqual(getattr(self.client, method)(url).status_code, 401, url)

    def test_list_only_mine_newest_first(self):
        r = self.client.get(reverse("notification-list"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 3)
        self.assertEqual([n["id"] for n in r.data["results"]], [self.a3.id, self.a2.id, self.a1.id])
        self.assertEqual(r.data["results"][2]["actor"]["username"], "bob")
        self.assertNotIn("email", r.data["results"][2]["actor"])

    def test_filters(self):
        url = reverse("notification-list")
        self.assertEqual(self.client.get(url, {"is_read": "false"}).data["count"], 2)
        self.assertEqual(self.client.get(url, {"is_read": "true"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"type": "swap_requested"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"type": "system", "is_read": "false"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"is_read": "maybe"}).status_code, 400)
        self.assertEqual(self.client.get(url, {"type": "bogus"}).status_code, 400)

    def test_unread_count(self):
        r = self.client.get(reverse("notification-unread-count"))
        self.assertEqual(r.data, {"unread_count": 2})

    def test_mark_one_read(self):
        r = self.client.post(reverse("notification-read", args=[self.a1.pk]))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["is_read"])
        self.a1.refresh_from_db()
        self.assertTrue(self.a1.is_read)

    def test_read_all_only_touches_mine(self):
        r = self.client.post(reverse("notification-read-all"))
        self.assertEqual(r.data, {"updated": 2})
        self.assertEqual(self.client.get(reverse("notification-unread-count")).data["unread_count"], 0)
        self.b1.refresh_from_db()
        self.assertFalse(self.b1.is_read)

    def test_delete_mine(self):
        r = self.client.delete(reverse("notification-detail", args=[self.a2.pk]))
        self.assertEqual(r.status_code, 204)
        self.assertFalse(Notification.objects.filter(pk=self.a2.pk).exists())

    def test_cannot_touch_other_users_notifications(self):
        self.assertEqual(self.client.post(reverse("notification-read", args=[self.b1.pk])).status_code, 404)
        self.assertEqual(self.client.delete(reverse("notification-detail", args=[self.b1.pk])).status_code, 404)
        self.b1.refresh_from_db()
        self.assertFalse(self.b1.is_read)


class SignalHandlerTests(TestCase):
    """Handlers are exercised with stand-in objects because the real models may not exist yet."""

    def setUp(self):
        self.req = make_user("requester")
        self.rec = make_user("receiver")

    def test_register_all_skips_missing_models(self):
        connected = signals.register_all()
        for label in ("swaps.SwapRequest", "scheduling.Session", "reviews.Review"):
            try:
                apps.get_model(*label.split("."))
            except LookupError:
                self.assertNotIn(label, connected)

    def test_swap_lifecycle(self):
        swap = SimpleNamespace(pk=7, requester=self.req, receiver=self.rec, status="pending")
        signals.swap_saved(None, swap, created=True)
        signals.swap_saved(None, swap, created=True)  # duplicate create is ignored
        self.assertEqual(Notification.objects.filter(recipient=self.rec, notification_type=T.SWAP_REQUESTED).count(), 1)

        swap.status = "accepted"
        signals.swap_saved(None, swap)
        signals.swap_saved(None, swap)  # same status again: no new notification
        n = Notification.objects.get(notification_type=T.SWAP_ACCEPTED)
        self.assertEqual((n.recipient, n.actor, n.target_type, n.target_id), (self.req, self.rec, "swap", 7))

        swap.status = "cancelled"
        signals.swap_saved(None, swap)
        self.assertEqual(Notification.objects.get(notification_type=T.SWAP_CANCELLED).recipient, self.rec)
        self.assertEqual(Notification.objects.count(), 3)

    def test_swap_raw_save_ignored(self):
        swap = SimpleNamespace(pk=1, requester=self.req, receiver=self.rec, status="pending")
        signals.swap_saved(None, swap, created=True, raw=True)
        self.assertEqual(Notification.objects.count(), 0)

    def test_review_created(self):
        review = SimpleNamespace(pk=4, reviewer=self.req, reviewee=self.rec, rating=5)
        signals.review_saved(None, review, created=True)
        signals.review_saved(None, review, created=True)
        signals.review_saved(None, review, created=False)
        n = Notification.objects.get()
        self.assertEqual((n.recipient, n.notification_type), (self.rec, T.REVIEW_RECEIVED))
        self.assertIn("5/5", n.message)

    def test_session_created_notifies_other_participant(self):
        swap = SimpleNamespace(requester=self.req, receiver=self.rec)
        session = SimpleNamespace(pk=9, swap=swap, status="scheduled", created_by=self.req)
        signals.session_saved(None, session, created=True)
        n = Notification.objects.get()
        self.assertEqual((n.recipient, n.notification_type), (self.rec, T.SESSION_SCHEDULED))

    def test_session_updated_and_cancelled(self):
        swap = SimpleNamespace(requester=self.req, receiver=self.rec)
        session = SimpleNamespace(pk=9, swap=swap, status="scheduled", location="Library")
        session._notif_old_values = {"status": "scheduled", "location": "Cafe"}
        signals.session_saved(None, session)
        self.assertEqual(Notification.objects.filter(notification_type=T.SESSION_UPDATED).count(), 2)
        signals.session_saved(None, session)  # nothing changed since
        self.assertEqual(Notification.objects.filter(notification_type=T.SESSION_UPDATED).count(), 2)

        session.status = "cancelled"
        signals.session_saved(None, session)
        self.assertEqual(Notification.objects.filter(notification_type=T.SESSION_CANCELLED).count(), 2)
