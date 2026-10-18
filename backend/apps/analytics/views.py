from django.contrib.auth import get_user_model
from rest_framework import filters, generics, permissions
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.skills.models import Skill

from . import services
from .serializers import AdminUserSerializer, AdminUserStatusSerializer

User = get_user_model()

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


# --------------------------------------------------------------------------- moderation

class AdminUserListView(generics.ListAPIView):
    """
    GET /api/admin/users/ - all users, newest first (paginated).
    Query params: ?search=<username/email/name/college>, ?is_active=true|false
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminUserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "email", "first_name", "last_name", "college"]

    def get_queryset(self):
        qs = User.objects.order_by("-date_joined", "-id")
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            value = is_active.strip().lower()
            if value not in ("true", "false"):
                raise ValidationError({"is_active": ["Must be true or false."]})
            qs = qs.filter(is_active=(value == "true"))
        return qs


class AdminUserUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/admin/users/<id>/ with {"is_active": bool}.
    Admins cannot deactivate their own account or any superuser.
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminUserStatusSerializer
    queryset = User.objects.all()
    http_method_names = ["patch", "options"]

    def perform_update(self, serializer):
        target = serializer.instance
        if serializer.validated_data["is_active"] is False:
            if target.pk == self.request.user.pk:
                raise PermissionDenied("You cannot deactivate your own account.")
            if target.is_superuser:
                raise PermissionDenied("Superuser accounts cannot be deactivated.")
        serializer.save()

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        return Response(AdminUserSerializer(self.get_object()).data)


class AdminSkillDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/admin/skills/<id>/ - remove an inappropriate catalog skill.
    WARNING: this cascades and also deletes every UserSkill (offer/want) row
    that references the skill.
    """
    permission_classes = [permissions.IsAdminUser]
    queryset = Skill.objects.all()


class AdminReviewDeleteView(APIView):
    """
    DELETE /api/admin/reviews/<id>/ - remove an abusive review.
    Guarded: returns 404 while the reviews app has no Review model.
    """
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        Review = services.get_optional_model("reviews", "Review")
        if Review is None:
            raise NotFound("Reviews are not available yet.")
        deleted, _ = Review.objects.filter(pk=pk).delete()
        if not deleted:
            raise NotFound("Review not found.")
        return Response(status=204)
