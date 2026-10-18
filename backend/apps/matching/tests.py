from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.skills.models import Skill, UserSkill

from .services import get_matches_for

User = get_user_model()
OFFER = UserSkill.SkillType.OFFER
WANT = UserSkill.SkillType.WANT


def make_user(username, college="", is_active=True):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="pass12345!",
        college=college, is_active=is_active,
    )


def give(user, skill, skill_type):
    return UserSkill.objects.create(user=user, skill=skill, skill_type=skill_type)


class MatchFixtureMixin:
    """me: wants Python, offers Guitar."""

    def setUp(self):
        self.python = Skill.objects.create(name="Python", category="Programming")
        self.guitar = Skill.objects.create(name="Guitar", category="Music")
        self.french = Skill.objects.create(name="French", category="Languages")

        self.me = make_user("me", college="MIT")
        give(self.me, self.python, WANT)
        give(self.me, self.guitar, OFFER)


class MatchServiceTests(MatchFixtureMixin, TestCase):
    def test_mutual_match_ranks_above_one_way(self):
        # one-way: teaches me Python only
        one_way = make_user("aaron")
        give(one_way, self.python, OFFER)
        # mutual: teaches Python and wants Guitar
        mutual = make_user("zoe")
        give(mutual, self.python, OFFER)
        give(mutual, self.guitar, WANT)

        matches = get_matches_for(self.me)

        self.assertEqual([m["user"] for m in matches], [mutual, one_way])
        self.assertTrue(matches[0]["is_mutual"])
        self.assertEqual(matches[0]["score"], 100 + 10 + 10)
        self.assertFalse(matches[1]["is_mutual"])
        self.assertEqual(matches[1]["score"], 10)
        self.assertEqual(matches[0]["they_can_teach_you"], [self.python])
        self.assertEqual(matches[0]["you_can_teach_them"], [self.guitar])

    def test_mutual_first_even_if_one_way_scores_higher(self):
        # one-way partner wanting many things I offer would outscore on points
        extra = [Skill.objects.create(name=f"S{i}") for i in range(13)]
        for s in extra:
            give(self.me, s, OFFER)
        heavy = make_user("heavy")
        for s in extra:
            give(heavy, s, WANT)
        mutual = make_user("mutual")
        give(mutual, self.python, OFFER)
        give(mutual, self.guitar, WANT)

        matches = get_matches_for(self.me)
        self.assertEqual(matches[0]["user"], mutual)
        self.assertGreater(matches[1]["score"], matches[0]["score"])

    def test_self_and_inactive_users_excluded(self):
        inactive = make_user("ghost", is_active=False)
        give(inactive, self.python, OFFER)
        give(self.me, self.python, OFFER)  # I also offer what I want

        self.assertEqual(get_matches_for(self.me), [])

    def test_user_without_skills_gets_empty_list(self):
        lonely = make_user("lonely")
        other = make_user("other")
        give(other, self.python, OFFER)
        self.assertEqual(get_matches_for(lonely), [])

    def test_unrelated_users_are_not_matches(self):
        other = make_user("other")
        give(other, self.french, OFFER)
        give(other, self.french, WANT)
        self.assertEqual(get_matches_for(self.me), [])

    def test_same_college_bonus_case_insensitive(self):
        same = make_user("same", college="  mit ")
        give(same, self.python, OFFER)
        diff = make_user("diff", college="Stanford")
        give(diff, self.python, OFFER)

        matches = {m["user"].username: m for m in get_matches_for(self.me)}
        self.assertEqual(matches["same"]["score"], 15)
        self.assertEqual(matches["diff"]["score"], 10)

    def test_empty_college_never_gets_bonus(self):
        self.me.college = ""
        self.me.save()
        other = make_user("other", college="")
        give(other, self.python, OFFER)
        self.assertEqual(get_matches_for(self.me)[0]["score"], 10)

    def test_ties_sorted_by_username(self):
        for name in ("charlie", "alice", "bob"):
            give(make_user(name), self.python, OFFER)
        names = [m["user"].username for m in get_matches_for(self.me)]
        self.assertEqual(names, ["alice", "bob", "charlie"])

    def test_filters(self):
        mutual = make_user("mutual", college="MIT")
        give(mutual, self.python, OFFER)
        give(mutual, self.guitar, WANT)
        teacher = make_user("teacher", college="Other")
        give(teacher, self.python, OFFER)
        learner = make_user("learner", college="mit")
        give(learner, self.guitar, WANT)

        def names(**kw):
            return [m["user"].username for m in get_matches_for(self.me, **kw)]

        self.assertEqual(names(mutual_only=True), ["mutual"])
        self.assertEqual(names(same_college=True), ["mutual", "learner"])
        self.assertEqual(names(skill_id=self.python.id), ["mutual", "teacher"])
        self.assertEqual(names(skill_id=self.guitar.id), ["mutual", "learner"])
        self.assertEqual(names(skill_id=self.french.id), [])

    def test_query_count_is_constant(self):
        for i in range(3):
            u = make_user(f"u{i}")
            give(u, self.python, OFFER)
            give(u, self.guitar, WANT)
        with self.assertNumQueries(2):
            get_matches_for(self.me)
        for i in range(3, 10):
            u = make_user(f"u{i}")
            give(u, self.python, OFFER)
        with self.assertNumQueries(2):
            get_matches_for(self.me)


class MatchEndpointTests(MatchFixtureMixin, APITestCase):
    url = reverse("match-list")

    def setUp(self):
        super().setUp()
        self.mutual = make_user("mutual", college="MIT")
        give(self.mutual, self.python, OFFER)
        give(self.mutual, self.guitar, WANT)
        self.teacher = make_user("teacher")
        give(self.teacher, self.python, OFFER)

    def test_unauthenticated_returns_401(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_response_shape_and_pagination(self):
        self.client.force_authenticate(self.me)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(set(resp.data), {"count", "next", "previous", "results"})
        self.assertEqual(resp.data["count"], 2)
        first = resp.data["results"][0]
        self.assertEqual(
            set(first), {"user", "is_mutual", "score", "they_can_teach_you", "you_can_teach_them"}
        )
        self.assertEqual(first["user"]["username"], "mutual")
        self.assertNotIn("email", first["user"])
        self.assertEqual(first["score"], 125)
        self.assertEqual(first["they_can_teach_you"][0]["name"], "Python")
        self.assertEqual(first["you_can_teach_them"][0]["name"], "Guitar")

    def test_query_params(self):
        self.client.force_authenticate(self.me)
        r = self.client.get(self.url, {"mutual_only": "true"})
        self.assertEqual([m["user"]["username"] for m in r.data["results"]], ["mutual"])
        r = self.client.get(self.url, {"same_college": "true"})
        self.assertEqual([m["user"]["username"] for m in r.data["results"]], ["mutual"])
        r = self.client.get(self.url, {"skill": self.guitar.id})
        self.assertEqual([m["user"]["username"] for m in r.data["results"]], ["mutual"])

    def test_invalid_query_params_return_400(self):
        self.client.force_authenticate(self.me)
        self.assertEqual(self.client.get(self.url, {"skill": "abc"}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {"mutual_only": "maybe"}).status_code, 400)
