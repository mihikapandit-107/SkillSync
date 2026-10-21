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
