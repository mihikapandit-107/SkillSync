"""
Points, levels and badges, computed from existing swaps / sessions / reviews / skills.

Nothing is stored: every number can be recomputed at any time, so there is
no data to migrate or keep in sync. `collect_stats()` runs a fixed number of
grouped queries regardless of how many users are involved.
"""
from collections import defaultdict

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum

from apps.reviews.models import Review
from apps.scheduling.models import Session
from apps.skills.models import UserSkill
from apps.swaps.models import SwapRequest

User = get_user_model()

# --------------------------------------------------------------------------- rules

POINTS_PER_SESSION = 20          # each completed session (both participants)
POINTS_PER_ACCEPTED_SWAP = 10    # each accepted swap (both participants)
POINTS_PER_REVIEW_GIVEN = 3      # leaving feedback for a partner
POINTS_PER_STAR_RECEIVED = 2     # a 5-star review earns 10 points
POINTS_PER_OFFERED_SKILL = 5     # listing skills you can teach...
MAX_OFFERED_SKILLS_COUNTED = 10  # ...up to this many

LEVELS = [  # (minimum points, name), ascending
    (0, "Newcomer"),
    (50, "Explorer"),
    (150, "Contributor"),
    (300, "Mentor"),
    (600, "Luminary"),
]

# key, name, description, icon (lucide-react name), tier, stat, target
BADGES = [
    ("first_swap", "First Exchange", "Had your first swap request accepted.",
     "Handshake", "bronze", "swaps_accepted", 1),
    ("mentor", "Mentor", "Completed 5 learning sessions.",
     "GraduationCap", "silver", "sessions_completed", 5),
    ("master_mentor", "Master Mentor", "Completed 20 learning sessions.",
     "Crown", "gold", "sessions_completed", 20),
    ("top_rated", "Top Rated", "Average rating of 4.5+ across at least 3 reviews.",
     "Star", "gold", "reviews_received", 3),
    ("polymath", "Polymath", "Offers to teach 5 or more skills.",
     "Layers", "silver", "skills_offered", 5),
    ("curious_mind", "Curious Mind", "Wants to learn 5 or more skills.",
     "Lightbulb", "bronze", "skills_wanted", 5),
    ("feedback_champion", "Feedback Champion", "Left 5 reviews for learning partners.",
     "MessageSquareHeart", "bronze", "reviews_given", 5),
    ("campus_connector", "Campus Connector", "Swapped skills with 5 different students.",
     "Users", "silver", "unique_partners", 5),
]
TOP_RATED_MIN_AVERAGE = 4.5

EMPTY_STATS = {
    "swaps_accepted": 0,
    "unique_partners": 0,
    "sessions_completed": 0,
    "reviews_received": 0,
    "rating_sum": 0,
    "average_rating": None,
    "reviews_given": 0,
    "skills_offered": 0,
    "skills_wanted": 0,
}


# --------------------------------------------------------------------------- stats

def collect_stats(user_ids=None):
    """
    Return {user_id: stats_dict} for the given ids (or every user if None).
    Users with no activity still get an entry when ids are given.
    """
    stats = defaultdict(lambda: dict(EMPTY_STATS))

    def scoped(qs, field):
        return qs.filter(**{f"{field}__in": user_ids}) if user_ids is not None else qs

    # Accepted swaps + distinct partners (one query; one row per swap).
    partners = defaultdict(set)
    swaps = SwapRequest.objects.filter(status=SwapRequest.Status.ACCEPTED)
    if user_ids is not None:
        swaps = swaps.filter(Q(requester_id__in=user_ids) | Q(receiver_id__in=user_ids))
    for requester_id, receiver_id in swaps.values_list("requester_id", "receiver_id"):
        for me, other in ((requester_id, receiver_id), (receiver_id, requester_id)):
            stats[me]["swaps_accepted"] += 1
            partners[me].add(other)
    for uid, others in partners.items():
        stats[uid]["unique_partners"] = len(others)

    # Completed sessions, counted for both sides of the swap.
    completed = Session.objects.filter(status=Session.Status.COMPLETED)
    for side in ("swap__requester_id", "swap__receiver_id"):
        for row in scoped(completed, side).values(side).annotate(n=Count("id")):
            stats[row[side]]["sessions_completed"] += row["n"]

    # Reviews received (count, sum, average) and given.
    for row in scoped(Review.objects, "reviewee_id").values("reviewee_id").annotate(
        n=Count("id"), total=Sum("rating"), avg=Avg("rating")
    ):
        s = stats[row["reviewee_id"]]
        s["reviews_received"] = row["n"]
        s["rating_sum"] = row["total"] or 0
        s["average_rating"] = round(row["avg"], 2) if row["avg"] is not None else None
    for row in scoped(Review.objects, "reviewer_id").values("reviewer_id").annotate(n=Count("id")):
        stats[row["reviewer_id"]]["reviews_given"] = row["n"]

    # Skills listed.
    for row in scoped(UserSkill.objects, "user_id").values("user_id", "skill_type").annotate(
        n=Count("id")
    ):
        key = "skills_offered" if row["skill_type"] == UserSkill.SkillType.OFFER else "skills_wanted"
        stats[row["user_id"]][key] = row["n"]

    if user_ids is not None:
        wanted = set(user_ids)
        for uid in wanted:
            stats[uid]  # touch so every requested id has an entry
        return {uid: s for uid, s in stats.items() if uid in wanted}
    return dict(stats)


# --------------------------------------------------------------------------- scoring

def points_for(s):
    return (
        s["sessions_completed"] * POINTS_PER_SESSION
        + s["swaps_accepted"] * POINTS_PER_ACCEPTED_SWAP
        + s["reviews_given"] * POINTS_PER_REVIEW_GIVEN
        + s["rating_sum"] * POINTS_PER_STAR_RECEIVED
        + min(s["skills_offered"], MAX_OFFERED_SKILLS_COUNTED) * POINTS_PER_OFFERED_SKILL
    )


def level_for(points):
    """Current level plus progress toward the next one."""
    index = max(i for i, (minimum, _) in enumerate(LEVELS) if points >= minimum)
    floor, name = LEVELS[index]
    if index + 1 < len(LEVELS):
        ceiling, next_name = LEVELS[index + 1]
        progress = round((points - floor) / (ceiling - floor) * 100)
    else:
        ceiling, next_name, progress = None, None, 100
    return {
        "number": index + 1,
        "name": name,
        "min_points": floor,
        "next_level": next_name,
        "next_level_points": ceiling,
        "progress_percent": progress,
    }


def badges_for(s):
    """Every badge with earned flag and progress, earned ones first."""
    result = []
    for key, name, description, icon, tier, stat, target in BADGES:
        current = s[stat]
        earned = current >= target
        if key == "top_rated":
            avg = s["average_rating"]
            earned = earned and avg is not None and avg >= TOP_RATED_MIN_AVERAGE
        result.append({
            "key": key,
            "name": name,
            "description": description,
            "icon": icon,
            "tier": tier,
            "earned": earned,
            "current": min(current, target),
            "target": target,
        })
    result.sort(key=lambda b: not b["earned"])
    return result


def summary_for(user_id, stats=None):
    """Full achievements payload for one user."""
    s = stats if stats is not None else collect_stats([user_id])[user_id]
    points = points_for(s)
    badges = badges_for(s)
    public_stats = {k: v for k, v in s.items() if k != "rating_sum"}
    return {
        "points": points,
        "level": level_for(points),
        "badges": badges,
        "badges_earned": sum(1 for b in badges if b["earned"]),
        "stats": public_stats,
    }


def leaderboard(college=None):
    """
    Active students ranked by points (ties share a rank), highest first.
    Students with zero points are left out. Returns list of (user, summary, rank).
    """
    users = User.objects.filter(is_active=True, is_staff=False)
    if college:
        users = users.filter(college__iexact=college.strip())
    users = {u.pk: u for u in users}
    if not users:
        return []

    all_stats = collect_stats(list(users))
    rows = []
    for uid, user in users.items():
        summary = summary_for(uid, all_stats[uid])
        if summary["points"] > 0:
            rows.append((user, summary))
    rows.sort(key=lambda r: (-r[1]["points"], -r[1]["badges_earned"], r[0].username.lower()))

    ranked, last_points, rank = [], None, 0
    for position, (user, summary) in enumerate(rows, start=1):
        if summary["points"] != last_points:
            rank, last_points = position, summary["points"]
        ranked.append((user, summary, rank))
    return ranked
