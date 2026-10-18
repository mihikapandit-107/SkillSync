"""
Analytics for the admin dashboard.

Every function returns plain dicts/lists built from ORM aggregates.
Swaps, sessions and reviews are resolved lazily with apps.get_model(); if a
model (or a field we rely on) is missing, the related metrics are None
(series functions return None) instead of raising.

Assumed fields for guarded models (adapt here when those apps are built):
  swaps.SwapRequest  : status in pending/accepted/rejected/cancelled
  scheduling.Session : status in scheduled/completed/cancelled, and a date
                       field, first found of SESSION_DATE_FIELDS
  reviews.Review     : reviewee (FK user), rating (1-5)
"""
from datetime import timedelta

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.exceptions import FieldError
from django.db.models import Avg, Count, F, Q
from django.db.models.functions import TruncWeek
from django.utils import timezone

from apps.skills.models import Skill, UserSkill

SWAP_STATUSES = ("pending", "accepted", "rejected", "cancelled")
SESSION_DATE_FIELDS = ("scheduled_at", "start_time", "starts_at", "date", "created_at")


# --------------------------------------------------------------------------- helpers

def get_optional_model(app_label, model_name):
    """Return the model class or None if it is not defined (yet)."""
    try:
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None


def _has_fields(model, *names):
    existing = {f.name for f in model._meta.get_fields()}
    return all(n in existing for n in names)


def _swap_model():
    m = get_optional_model("swaps", "SwapRequest")
    return m if m and _has_fields(m, "status") else None


def _session_model():
    m = get_optional_model("scheduling", "Session")
    return m if m and _has_fields(m, "status") else None


def _review_model():
    m = get_optional_model("reviews", "Review")
    return m if m and _has_fields(m, "reviewee", "rating") else None


def _session_date_field(model):
    for name in SESSION_DATE_FIELDS:
        if _has_fields(model, name):
            return name
    return None


def _week_start(dt):
    """Monday 00:00 of the week containing dt (as a date)."""
    d = timezone.localtime(dt).date() if timezone.is_aware(dt) else dt.date()
    return d - timedelta(days=d.weekday())


def _weekly_series(queryset, date_field, weeks):
    """Count rows per week for the last `weeks` weeks, zero-filled, oldest first."""
    this_week = _week_start(timezone.now())
    first_week = this_week - timedelta(weeks=weeks - 1)
    rows = (
        queryset.filter(**{f"{date_field}__date__gte": first_week})
        .annotate(week=TruncWeek(date_field))
        .values("week")
        .annotate(count=Count("pk"))
        .order_by()
    )
    counts = {}
    for row in rows:
        week = row["week"]
        key = week.date() if hasattr(week, "date") else week
        counts[key] = counts.get(key, 0) + row["count"]
    return [
        {"week_start": (first_week + timedelta(weeks=i)).isoformat(),
         "count": counts.get(first_week + timedelta(weeks=i), 0)}
        for i in range(weeks)
    ]


def _skill_counts():
    return Skill.objects.annotate(
        offer_count=Count("user_skills", filter=Q(user_skills__skill_type=UserSkill.SkillType.OFFER)),
        want_count=Count("user_skills", filter=Q(user_skills__skill_type=UserSkill.SkillType.WANT)),
        total_count=Count("user_skills"),
    )


def _skill_row(skill):
    return {
        "id": skill.id, "name": skill.name, "category": skill.category,
        "offer_count": skill.offer_count, "want_count": skill.want_count,
        "total_count": skill.total_count,
    }


# --------------------------------------------------------------------------- metrics

def swap_success_rate(by_status):
    """accepted / (accepted + rejected + cancelled); 0.0 when there are none."""
    accepted = by_status.get("accepted", 0)
    decided = accepted + by_status.get("rejected", 0) + by_status.get("cancelled", 0)
    return round(accepted / decided, 4) if decided else 0.0


def overview():
    """Headline numbers for the dashboard."""
    User = get_user_model()
    week_ago = timezone.now() - timedelta(days=7)
    users = User.objects.aggregate(
        total_users=Count("pk"),
        active_users=Count("pk", filter=Q(is_active=True)),
        new_users_last_7_days=Count("pk", filter=Q(date_joined__gte=week_ago)),
    )
    skills = UserSkill.objects.aggregate(
        total_offers=Count("pk", filter=Q(skill_type=UserSkill.SkillType.OFFER)),
        total_wants=Count("pk", filter=Q(skill_type=UserSkill.SkillType.WANT)),
    )
    data = {
        **users,
        "total_skills": Skill.objects.count(),
        **skills,
        "swaps_total": None,
        "swaps_by_status": None,
        "swap_success_rate": None,
        "sessions_total": None,
        "sessions_completed": None,
        "average_rating": None,
    }

    Swap = _swap_model()
    if Swap:
        try:
            by_status = {s: 0 for s in SWAP_STATUSES}
            for row in Swap.objects.values("status").annotate(n=Count("pk")).order_by():
                by_status[row["status"]] = row["n"]
            data["swaps_total"] = sum(by_status.values())
            data["swaps_by_status"] = by_status
            data["swap_success_rate"] = swap_success_rate(by_status)
        except FieldError:
            pass

    Session = _session_model()
    if Session:
        try:
            agg = Session.objects.aggregate(
                total=Count("pk"), completed=Count("pk", filter=Q(status="completed")),
            )
            data["sessions_total"] = agg["total"]
            data["sessions_completed"] = agg["completed"]
        except FieldError:
            pass

    Review = _review_model()
    if Review:
        try:
            avg = Review.objects.aggregate(avg=Avg("rating"))["avg"]
            data["average_rating"] = round(avg, 2) if avg is not None else None
        except FieldError:
            pass

    data["integrations"] = {
        "swaps": Swap is not None, "sessions": Session is not None, "reviews": Review is not None,
    }
    return data


def popular_skills(limit=10, skill_type=None):
    """Skills ranked by number of UserSkill rows (or by offers/wants if skill_type given)."""
    order = {"offer": "-offer_count", "want": "-want_count"}.get(skill_type, "-total_count")
    qs = _skill_counts().filter(total_count__gt=0)
    if skill_type in ("offer", "want"):
        qs = qs.filter(**{f"{skill_type}_count__gt": 0})
    return [_skill_row(s) for s in qs.order_by(order, "name")[:limit]]


def skill_demand_gap(limit=10):
    """Skills most wanted relative to supply: largest (want_count - offer_count) > 0."""
    qs = (
        _skill_counts()
        .annotate(gap=F("want_count") - F("offer_count"))
        .filter(gap__gt=0)
        .order_by("-gap", "-want_count", "name")[:limit]
    )
    return [{**_skill_row(s), "gap": s.gap} for s in qs]


def signups_over_time(weeks=12):
    """Users registered per week, oldest first."""
    return _weekly_series(get_user_model().objects.all(), "date_joined", weeks)


def sessions_over_time(weeks=12):
    """Sessions per week, or None if the Session model (or a date field) is unavailable."""
    Session = _session_model()
    if not Session:
        return None
    date_field = _session_date_field(Session)
    if not date_field:
        return None
    try:
        return _weekly_series(Session.objects.all(), date_field, weeks)
    except FieldError:
        return None


def top_rated_users(limit=10, min_reviews=1):
    """Users by average rating (min_reviews required), or None if reviews are unavailable."""
    Review = _review_model()
    if not Review:
        return None
    try:
        rows = list(
            Review.objects.values("reviewee")
            .annotate(average_rating=Avg("rating"), review_count=Count("pk"))
            .filter(review_count__gte=min_reviews)
            .order_by("-average_rating", "-review_count", "reviewee")[:limit]
        )
    except FieldError:
        return None
    users = get_user_model().objects.in_bulk([r["reviewee"] for r in rows])
    result = []
    for r in rows:
        u = users.get(r["reviewee"])
        if u is None:
            continue
        result.append({
            "user": {"id": u.id, "username": u.username, "first_name": u.first_name,
                     "last_name": u.last_name, "college": u.college},
            "average_rating": round(r["average_rating"], 2),
            "review_count": r["review_count"],
        })
    return result
