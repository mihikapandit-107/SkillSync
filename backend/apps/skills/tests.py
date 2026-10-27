from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Skill, UserSkill

User = get_user_model()


class DiscoverApiTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="password123",
            college="Engineering",
            avatar_url="https://example.com/alice.jpg",
        )
        self.user2 = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="password123",
            college="Design",
            avatar_url="https://example.com/bob.jpg",
        )
        self.skill = Skill.objects.create(name="Python", category="Programming")
        self.user_skill = UserSkill.objects.create(
            user=self.user2,
            skill=self.skill,
            skill_type=UserSkill.SkillType.OFFER,
            level=UserSkill.Level.ADVANCED,
            description="Happy to teach Python",
        )
        self.client.force_authenticate(user=self.user1)

    def test_discover_with_invalid_skill_param_returns_400(self):
        url = reverse("discover") + "?skill=abc"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("skill", response.data)

    def test_discover_with_invalid_type_returns_400(self):
        url = reverse("discover") + "?type=invalid"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_discover_with_invalid_level_returns_400(self):
        url = reverse("discover") + "?level=expert"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_discover_valid_returns_200(self):
        url = reverse("discover") + f"?skill={self.skill.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["user"]["username"], "bob")
        self.assertEqual(response.data["results"][0]["user"]["avatar_url"], "https://example.com/bob.jpg")

    def test_user_skills_endpoint(self):
        url = reverse("user-skills", kwargs={"pk": self.user2.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("offered_skills", response.data)
        self.assertIn("wanted_skills", response.data)
        self.assertEqual(len(response.data["offered_skills"]), 1)
        self.assertEqual(response.data["offered_skills"][0]["name"], "Python")

    def test_user_me_serializer_includes_avatar_and_skills(self):
        self.client.force_authenticate(user=self.user2)
        url = reverse("me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["avatar_url"], "https://example.com/bob.jpg")
        self.assertIn("offered_skills", response.data)
        self.assertEqual(len(response.data["offered_skills"]), 1)


class SkillEndorsementTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice_end", "alice_end@campus.edu", "pass12345!")
        self.bob = User.objects.create_user("bob_end", "bob_end@campus.edu", "pass12345!")
        self.skill = Skill.objects.create(name="React & Node", category="Programming")
        self.user_skill = UserSkill.objects.create(
            user=self.bob,
            skill=self.skill,
            skill_type=UserSkill.SkillType.OFFER,
            level=UserSkill.Level.ADVANCED,
            description="Built several fullstack apps",
        )

    def test_peer_can_endorse_and_toggle(self):
        self.client.force_authenticate(self.alice)
        # 1. Endorse
        url = f"/api/skills/user-skills/{self.user_skill.id}/endorse/"
        res = self.client.post(url, {"comment": "Outstanding frontend developer!"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["endorsed"])
        self.assertEqual(res.data["endorsements_count"], 1)

        # 2. Check discover endpoint reflections
        disc = self.client.get("/api/discover/?type=offer")
        self.assertEqual(disc.status_code, status.HTTP_200_OK)
        results = disc.data.get("results", disc.data)
        matched = next(r for r in results if r["id"] == self.user_skill.id)
        self.assertEqual(matched["endorsements_count"], 1)
        self.assertTrue(matched["is_endorsed"])

        # 3. Toggle off (unendorse)
        un_res = self.client.post(url)
        self.assertEqual(un_res.status_code, status.HTTP_200_OK)
        self.assertFalse(un_res.data["endorsed"])
        self.assertEqual(un_res.data["endorsements_count"], 0)

    def test_cannot_endorse_own_skill(self):
        self.client.force_authenticate(self.bob)
        url = f"/api/skills/user-skills/{self.user_skill.id}/endorse/"
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot endorse your own", res.data["detail"].lower())

    def test_list_endorsements(self):
        self.client.force_authenticate(self.alice)
        endorse_url = f"/api/skills/user-skills/{self.user_skill.id}/endorse/"
        self.client.post(endorse_url, {"comment": "Super patient tutor!"})

        list_url = f"/api/skills/user-skills/{self.user_skill.id}/endorsements/"
        res = self.client.get(list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["endorser_username"], "alice_end")
        self.assertEqual(results[0]["comment"], "Super patient tutor!")
