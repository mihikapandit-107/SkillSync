from django.urls import path

from .views import (
    OverviewView, PopularSkillsView, SessionsView, SignupsView, SkillGapView, TopRatedView,
)

urlpatterns = [
    path("admin/analytics/overview/", OverviewView.as_view(), name="admin-analytics-overview"),
    path("admin/analytics/popular-skills/", PopularSkillsView.as_view(), name="admin-analytics-popular-skills"),
    path("admin/analytics/signups/", SignupsView.as_view(), name="admin-analytics-signups"),
    path("admin/analytics/sessions/", SessionsView.as_view(), name="admin-analytics-sessions"),
    path("admin/analytics/top-rated/", TopRatedView.as_view(), name="admin-analytics-top-rated"),
    path("admin/analytics/skill-gap/", SkillGapView.as_view(), name="admin-analytics-skill-gap"),
]
