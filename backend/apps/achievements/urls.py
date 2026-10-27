from django.urls import path

from .views import LeaderboardView, MyAchievementsView, UserAchievementsView

urlpatterns = [
    path("achievements/me/", MyAchievementsView.as_view(), name="achievements-me"),
    path("achievements/users/<int:pk>/", UserAchievementsView.as_view(), name="achievements-user"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
]
