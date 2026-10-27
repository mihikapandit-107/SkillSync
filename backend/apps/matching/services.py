"""
Match scoring for SkillSync.

A "match" is another active student who either can teach me something I
want (they_teach_me) or wants something I can teach (i_teach_them).
When both are true the match is mutual and ranks first.

Everything is computed with a constant number of queries:
  1. my own UserSkill rows
  2. every relevant UserSkill row of other active users (select_related)
  3. (optional) average ratings, only if the reviews app has a Review model
"""
from collections import defaultdict

from django.apps import apps
from django.core.exceptions import FieldError
from django.db.models import Avg, Q

from apps.safety.services import exclude_blocked
from apps.skills.models import UserSkill

MUTUAL_BONUS = 100
PER_SKILL_POINTS = 10
SAME_COLLEGE_BONUS = 5
MAX_RATING_BONUS = 5


def _same_college(a, b):
    """Case-insensitive college comparison; empty values never match."""
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    return bool(a) and a == b


def get_rating_bonuses(user_ids):
    """
    Return {user_id: bonus} where bonus is 0..5 based on average rating.

    Guarded integration: the reviews app may not define a Review model yet,
    so it is resolved lazily and any absence results in an empty dict
    (i.e. a bonus of 0 for everyone). Expected fields: reviewee (FK to user)
    and rating (1-5).
    """
    if not user_ids:
        return {}
    try:
        Review = apps.get_model("reviews", "Review")
    except LookupError:
        return {}
    try:
        rows = (
            Review.objects.filter(reviewee_id__in=user_ids)
            .values("reviewee_id")
            .annotate(avg=Avg("rating"))
        )
        return {
            row["reviewee_id"]: min(MAX_RATING_BONUS, max(0, round(row["avg"] or 0)))
            for row in rows
        }
    except FieldError:
        # Review exists but uses different field names; skip the bonus.
        return {}


def get_matches_for(user, mutual_only=False, same_college=False, skill_id=None):
    """
    Return a list of match dicts for `user`: mutual matches first, then by
    score descending, then username.

    Each dict: {"user", "is_mutual", "score", "they_can_teach_you",
    "you_can_teach_them"} where the last two are lists of Skill instances.

    Filters:
      mutual_only  - keep only mutual matches
      same_college - keep only students from the same (non-empty) college
      skill_id     - keep only matches where that skill appears in either list
    """
    my_rows = UserSkill.objects.filter(user=user).values_list("skill_id", "skill_type")
    wanted = {sid for sid, stype in my_rows if stype == UserSkill.SkillType.WANT}
    offered = {sid for sid, stype in my_rows if stype == UserSkill.SkillType.OFFER}
    if not wanted and not offered:
        return []
    if same_college and not (user.college or "").strip():
        return []

    # Only rows that can contribute to a match: their offers in my wants,
    # their wants in my offers. Students blocked either way are left out.
    candidate_rows = exclude_blocked(
        UserSkill.objects
        .filter(user__is_active=True)
        .exclude(user=user)
        .filter(
            Q(skill_type=UserSkill.SkillType.OFFER, skill_id__in=wanted)
            | Q(skill_type=UserSkill.SkillType.WANT, skill_id__in=offered)
        ),
        user,
    ).select_related("user", "skill")

    users = {}
    teach_me = defaultdict(dict)    # user_id -> {skill_id: Skill}
    teach_them = defaultdict(dict)
    for row in candidate_rows:
        users[row.user_id] = row.user
        if row.skill_type == UserSkill.SkillType.OFFER:
            teach_me[row.user_id][row.skill_id] = row.skill
        else:
            teach_them[row.user_id][row.skill_id] = row.skill

    if same_college:
        users = {uid: u for uid, u in users.items() if _same_college(user.college, u.college)}

    rating_bonus = get_rating_bonuses(list(users))

    matches = []
    for uid, other in users.items():
        they_teach = teach_me.get(uid, {})
        i_teach = teach_them.get(uid, {})
        is_mutual = bool(they_teach) and bool(i_teach)

        if mutual_only and not is_mutual:
            continue
        if skill_id is not None and skill_id not in they_teach and skill_id not in i_teach:
            continue

        score = PER_SKILL_POINTS * (len(they_teach) + len(i_teach))
        if is_mutual:
            score += MUTUAL_BONUS
        if _same_college(user.college, other.college):
            score += SAME_COLLEGE_BONUS
        score += rating_bonus.get(uid, 0)

        matches.append({
            "user": other,
            "is_mutual": is_mutual,
            "score": score,
            "they_can_teach_you": sorted(they_teach.values(), key=lambda s: s.name),
            "you_can_teach_them": sorted(i_teach.values(), key=lambda s: s.name),
        })

    # Mutual first (guaranteed even if a one-way match has many skills),
    # then score descending, then username.
    matches.sort(key=lambda m: (not m["is_mutual"], -m["score"], m["user"].username))
    return matches
