from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.skills.models import Skill, UserSkill
from . import services

User = get_user_model()
OFFER = UserSkill.SkillType.OFFER
WANT = UserSkill.SkillType.WANT


def create_user(username, is_staff=False, is_superuser=False, is_active=True, college=""):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="Pass12345!Secure",
        is_staff=is_staff,
        is_superuser=is_superuser,
        is_active=is_active,
        college=college,
    )


class AnalyticsServiceUnitTests(TestCase):
    def test_swap_success_rate_zero_and_edge_cases(self):
        # Empty dict or all zeroes
        self.assertEqual(services.swap_success_rate({}), 0.0)
        self.assertEqual(services.swap_success_rate({"accepted": 0, "rejected": 0, "cancelled": 0}), 0.0)
        self.assertEqual(services.swap_success_rate({"pending": 10}), 0.0)

        # Standard calculation
        self.assertEqual(services.swap_success_rate({"accepted": 3, "rejected": 1, "cancelled": 0}), 0.75)
        self.assertEqual(services.swap_success_rate({"accepted": 1, "rejected": 1, "cancelled": 1}), 0.3333)

    def test_overview_fixtures_and_absent_models(self):
        u1 = create_user("active1")
        u2 = create_user("active2")
        u3 = create_user("inactive", is_active=False)

        s1 = Skill.objects.create(name="Python", category="Coding")
        s2 = Skill.objects.create(name="Design", category="Art")

        UserSkill.objects.create(user=u1, skill=s1, skill_type=OFFER)
        UserSkill.objects.create(user=u2, skill=s1, skill_type=WANT)
        UserSkill.objects.create(user=u1, skill=s2, skill_type=WANT)

        data = services.overview()
        self.assertEqual(data["total_users"], 3)
        self.assertEqual(data["active_users"], 2)
        self.assertEqual(data["new_users_last_7_days"], 3)
        self.assertEqual(data["total_skills"], 2)
        self.assertEqual(data["total_offers"], 1)
        self.assertEqual(data["total_wants"], 2)

        # Absent cross-app models return None safely
        self.assertIsNone(data["swaps_total"])
        self.assertIsNone(data["swaps_by_status"])
        self.assertIsNone(data["swap_success_rate"])
        self.assertIsNone(data["sessions_total"])
        self.assertIsNone(data["sessions_completed"])
        self.assertIsNone(data["average_rating"])
        self.assertEqual(
            data["integrations"],
            {"swaps": False, "sessions": False, "reviews": False},
        )

    def test_popular_skills_and_demand_gap(self):
        u1 = create_user("u1")
        u2 = create_user("u2")
        u3 = create_user("u3")

        python = Skill.objects.create(name="Python")
        react = Skill.objects.create(name="React")
        piano = Skill.objects.create(name="Piano")

        # Python: 2 offers, 1 want (total 3, gap -1)
        UserSkill.objects.create(user=u1, skill=python, skill_type=OFFER)
        UserSkill.objects.create(user=u2, skill=python, skill_type=OFFER)
        UserSkill.objects.create(user=u3, skill=python, skill_type=WANT)

        # React: 0 offers, 2 wants (total 2, gap +2)
        UserSkill.objects.create(user=u1, skill=react, skill_type=WANT)
        UserSkill.objects.create(user=u2, skill=react, skill_type=WANT)

        # Piano: 1 offer, 0 wants (total 1, gap -1)
        UserSkill.objects.create(user=u3, skill=piano, skill_type=OFFER)

        popular_all = services.popular_skills()
        self.assertEqual([s["name"] for s in popular_all], ["Python", "React", "Piano"])

        popular_wants = services.popular_skills(skill_type="want")
        self.assertEqual([s["name"] for s in popular_wants], ["React", "Python"])

        gap = services.skill_demand_gap()
        self.assertEqual(len(gap), 1)
        self.assertEqual(gap[0]["name"], "React")
        self.assertEqual(gap[0]["gap"], 2)

    def test_absent_sessions_and_reviews_services(self):
        self.assertIsNone(services.sessions_over_time())
        self.assertIsNone(services.top_rated_users())


class AdminAnalyticsApiTests(APITestCase):
    def setUp(self):
        self.admin = create_user("admin_user", is_staff=True, is_superuser=False)
        self.normal = create_user("normal_user", is_staff=False)
        self.superuser = create_user("super_user", is_staff=True, is_superuser=True)
        self.target_user = create_user("student_user", is_active=True, college="MIT")

        self.skill = Skill.objects.create(name="Django", category="Web")
        self.user_skill = UserSkill.objects.create(
            user=self.target_user, skill=self.skill, skill_type=OFFER
        )

        self.endpoints = [
            ("get", reverse("admin-analytics-overview")),
            ("get", reverse("admin-analytics-popular-skills")),
            ("get", reverse("admin-analytics-signups")),
            ("get", reverse("admin-analytics-sessions")),
            ("get", reverse("admin-analytics-top-rated")),
            ("get", reverse("admin-analytics-skill-gap")),
            ("get", reverse("admin-user-list")),
            ("patch", reverse("admin-user-detail", args=[self.target_user.pk]), {"is_active": False}),
            ("delete", reverse("admin-skill-delete", args=[self.skill.pk])),
            ("delete", reverse("admin-review-delete", args=[999])),
        ]

    def test_permissions_anonymous_401(self):
        self.client.force_authenticate(None)
        for item in self.endpoints:
            method, url = item[0], item[1]
            data = item[2] if len(item) > 2 else None
            resp = getattr(self.client, method)(url, data=data, format="json")
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED, f"Failed 401 check on {url}")

    def test_permissions_normal_user_403(self):
        self.client.force_authenticate(self.normal)
        for item in self.endpoints:
            method, url = item[0], item[1]
            data = item[2] if len(item) > 2 else None
            resp = getattr(self.client, method)(url, data=data, format="json")
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN, f"Failed 403 check on {url}")

    def test_analytics_endpoints_admin_200_valid_json(self):
        self.client.force_authenticate(self.admin)

        # Overview
        r = self.client.get(reverse("admin-analytics-overview"))
        self.assertEqual(r.status_code, 200)
        self.assertIn("total_users", r.data)
        self.assertIn("integrations", r.data)

        # Popular skills
        r = self.client.get(reverse("admin-analytics-popular-skills"), {"limit": 5, "type": "offer"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("results", r.data)

        # Signups
        r = self.client.get(reverse("admin-analytics-signups"), {"weeks": 4})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["weeks"], 4)
        self.assertEqual(len(r.data["results"]), 4)

        # Sessions (graceful when model absent)
        r = self.client.get(reverse("admin-analytics-sessions"))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["available"])
        self.assertEqual(r.data["results"], [])

        # Top rated (graceful when model absent)
        r = self.client.get(reverse("admin-analytics-top-rated"))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["available"])
        self.assertEqual(r.data["results"], [])

        # Skill gap
        r = self.client.get(reverse("admin-analytics-skill-gap"))
        self.assertEqual(r.status_code, 200)
        self.assertIn("results", r.data)

    def test_analytics_param_validation_errors(self):
        self.client.force_authenticate(self.admin)
        # Invalid limit
        self.assertEqual(
            self.client.get(reverse("admin-analytics-popular-skills"), {"limit": "abc"}).status_code, 400
        )
        self.assertEqual(
            self.client.get(reverse("admin-analytics-popular-skills"), {"limit": 0}).status_code, 400
        )
        self.assertEqual(
            self.client.get(reverse("admin-analytics-popular-skills"), {"limit": 101}).status_code, 400
        )
        self.assertEqual(
            self.client.get(reverse("admin-analytics-popular-skills"), {"type": "invalid"}).status_code, 400
        )

        # Invalid weeks
        self.assertEqual(
            self.client.get(reverse("admin-analytics-signups"), {"weeks": 0}).status_code, 400
        )
        self.assertEqual(
            self.client.get(reverse("admin-analytics-signups"), {"weeks": 53}).status_code, 400
        )

    def test_moderation_user_list_filters_and_search(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-user-list")

        # All users
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 4)

        # Filter by active
        r = self.client.get(url, {"is_active": "true"})
        self.assertEqual(r.data["count"], 4)
        r = self.client.get(url, {"is_active": "false"})
        self.assertEqual(r.data["count"], 0)
        r = self.client.get(url, {"is_active": "invalid"})
        self.assertEqual(r.status_code, 400)

        # Search
        r = self.client.get(url, {"search": "MIT"})
        self.assertEqual(r.data["count"], 1)
        self.assertEqual(r.data["results"][0]["username"], "student_user")

    def test_moderation_deactivate_and_activate_user(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-user-detail", args=[self.target_user.pk])

        # Deactivate
        r = self.client.patch(url, {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["is_active"])
        self.target_user.refresh_from_db()
        self.assertFalse(self.target_user.is_active)

        # Activate
        r = self.client.patch(url, {"is_active": True}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["is_active"])
        self.target_user.refresh_from_db()
        self.assertTrue(self.target_user.is_active)

    def test_moderation_self_deactivation_blocked(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-user-detail", args=[self.admin.pk])
        r = self.client.patch(url, {"is_active": False}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("cannot deactivate your own account", r.data["detail"])
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_moderation_superuser_deactivation_blocked(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-user-detail", args=[self.superuser.pk])
        r = self.client.patch(url, {"is_active": False}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Superuser accounts cannot be deactivated", r.data["detail"])
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_active)

    def test_moderation_patch_user_extra_fields_rejected(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-user-detail", args=[self.target_user.pk])
        r = self.client.patch(url, {"is_active": False, "username": "new_name"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.data)

    def test_moderation_delete_skill_cascades(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-skill-delete", args=[self.skill.pk])
        r = self.client.delete(url)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Skill.objects.filter(pk=self.skill.pk).exists())
        self.assertFalse(UserSkill.objects.filter(pk=self.user_skill.pk).exists())

    def test_moderation_delete_review_when_model_absent(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-review-delete", args=[1])
        r = self.client.delete(url)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
