from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services

MAX_LIMIT = 100
MAX_WEEKS = 52


def positive_int_param(request, name, default, maximum):
    """Parse ?name= as an int in [1, maximum]; raise a field ValidationError otherwise."""
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ValidationError({name: ["Must be a positive integer."]})
    if value < 1 or value > maximum:
        raise ValidationError({name: [f"Must be between 1 and {maximum}."]})
    return value


class AdminAPIView(APIView):
    """Base for admin dashboard endpoints: staff only (anonymous 401, non-staff 403)."""
    permission_classes = [permissions.IsAdminUser]


class OverviewView(AdminAPIView):
    """GET /api/admin/analytics/overview/ - headline platform numbers."""

    def get(self, request):
        return Response(services.overview())


class PopularSkillsView(AdminAPIView):
    """GET /api/admin/analytics/popular-skills/?limit=10&type=offer|want"""

    def get(self, request):
        limit = positive_int_param(request, "limit", 10, MAX_LIMIT)
        skill_type = request.query_params.get("type") or None
        if skill_type not in (None, "offer", "want"):
            raise ValidationError({"type": ["Must be 'offer' or 'want'."]})
        return Response({"results": services.popular_skills(limit=limit, skill_type=skill_type)})


class SignupsView(AdminAPIView):
    """GET /api/admin/analytics/signups/?weeks=12 - new users per week."""

    def get(self, request):
        weeks = positive_int_param(request, "weeks", 12, MAX_WEEKS)
        return Response({"weeks": weeks, "results": services.signups_over_time(weeks=weeks)})


class SessionsView(AdminAPIView):
    """GET /api/admin/analytics/sessions/?weeks=12 - sessions per week (if scheduling exists)."""

    def get(self, request):
        weeks = positive_int_param(request, "weeks", 12, MAX_WEEKS)
        series = services.sessions_over_time(weeks=weeks)
        return Response({"weeks": weeks, "available": series is not None, "results": series or []})


class TopRatedView(AdminAPIView):
    """GET /api/admin/analytics/top-rated/?limit=10&min_reviews=1 (if reviews exist)."""

    def get(self, request):
        limit = positive_int_param(request, "limit", 10, MAX_LIMIT)
        min_reviews = positive_int_param(request, "min_reviews", 1, 1000)
        rows = services.top_rated_users(limit=limit, min_reviews=min_reviews)
        return Response({"available": rows is not None, "results": rows or []})


class SkillGapView(AdminAPIView):
    """GET /api/admin/analytics/skill-gap/?limit=10 - most wanted vs offered skills."""

    def get(self, request):
        limit = positive_int_param(request, "limit", 10, MAX_LIMIT)
        return Response({"results": services.skill_demand_gap(limit=limit)})
