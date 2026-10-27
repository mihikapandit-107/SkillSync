from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import PublicUserSerializer
from . import services

User = get_user_model()

DEFAULT_LIMIT = 10
MAX_LIMIT = 50


class MyAchievementsView(APIView):
    """GET /achievements/me/: my points, level, badges and stats, plus my campus rank."""

    def get(self, request):
        data = services.summary_for(request.user.pk)
        ranked = services.leaderboard()
        data["rank"] = next((rank for u, _, rank in ranked if u.pk == request.user.pk), None)
        data["ranked_students"] = len(ranked)
        return Response(data)


class UserAchievementsView(APIView):
    """GET /achievements/users/<pk>/: another active student's achievements."""

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk, is_active=True)
        data = services.summary_for(user.pk)
        data["user"] = PublicUserSerializer(user).data
        return Response(data)


class LeaderboardView(APIView):
    """
    GET /leaderboard/?limit=10&college=<name>
    Top students by points. `me` holds my own row even if I'm outside the top list.
    """

    def get(self, request):
        raw = request.query_params.get("limit", DEFAULT_LIMIT)
        try:
            limit = int(raw)
        except (TypeError, ValueError):
            raise ValidationError({"limit": ["Must be an integer."]})
        limit = max(1, min(limit, MAX_LIMIT))
        college = (request.query_params.get("college") or "").strip() or None

        ranked = services.leaderboard(college=college)

        def row(user, summary, rank):
            return {
                "rank": rank,
                "user": PublicUserSerializer(user).data,
                "points": summary["points"],
                "level": summary["level"]["name"],
                "badges_earned": summary["badges_earned"],
                "top_badges": [b["key"] for b in summary["badges"] if b["earned"]][:3],
                "sessions_completed": summary["stats"]["sessions_completed"],
                "average_rating": summary["stats"]["average_rating"],
            }

        me = next((row(*r) for r in ranked if r[0].pk == request.user.pk), None)
        return Response({
            "college": college,
            "total_ranked": len(ranked),
            "results": [row(*r) for r in ranked[:limit]],
            "me": me,
        })
