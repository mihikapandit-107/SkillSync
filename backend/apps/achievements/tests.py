from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.skills.models import Skill, UserSkill
from apps.swaps.models import SwapRequest
from apps.scheduling.models import Session
from apps.reviews.models import Review
from django.utils import timezone

User = get_user_model()

class AchievementTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@test.com", "pass12345!", college="Stanford")
        self.bob = User.objects.create_user("bob", "b@test.com", "pass12345!", college="Stanford")

        self.python = Skill.objects.create(name="Python")
        self.guitar = Skill.objects.create(name="Guitar")

        UserSkill.objects.create(user=self.alice, skill=self.python, skill_type=UserSkill.SkillType.OFFER)
        UserSkill.objects.create(user=self.bob, skill=self.guitar, skill_type=UserSkill.SkillType.OFFER)

    def test_achievements_and_leaderboard(self):
        self.client.force_authenticate(self.alice)

        # Baseline achievements
        res = self.client.get("/api/achievements/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("points", res.data)
        self.assertIn("badges", res.data)
        self.assertEqual(res.data["points"], 5)  # 1 offered skill = 5 pts

        # Create accepted swap
        swap = SwapRequest.objects.create(
            requester=self.alice,
            receiver=self.bob,
            offered_skill=self.python,
            wanted_skill=self.guitar,
            status=SwapRequest.Status.ACCEPTED
        )

        # Complete a session
        session = Session.objects.create(
            swap=swap,
            scheduled_at=timezone.now(),
            duration_minutes=60,
            status=Session.Status.COMPLETED
        )

        # Bob gives Alice a 5-star review
        Review.objects.create(
            session=session,
            reviewer=self.bob,
            reviewee=self.alice,
            rating=5,
            comment="Awesome teacher!"
        )

        # Re-check achievements
        res = self.client.get("/api/achievements/me/")
        self.assertEqual(res.status_code, 200)
        # points = 5 (offered skill) + 10 (accepted swap) + 20 (completed session) + 10 (5 stars * 2) = 45
        self.assertEqual(res.data["points"], 45)

        # Leaderboard check
        lb_res = self.client.get("/api/leaderboard/?college=Stanford")
        self.assertEqual(lb_res.status_code, 200)
        self.assertGreaterEqual(len(lb_res.data["results"]), 1)
        self.assertEqual(lb_res.data["results"][0]["user"]["username"], "alice")
