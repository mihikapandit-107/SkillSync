from django.urls import path
from .views import (
    SkillListCreateView, SkillDetailView,
    MySkillListCreateView, MySkillDetailView, DiscoverView,
)

urlpatterns = [
    path("skills/", SkillListCreateView.as_view(), name="skill-list"),
    path("skills/<int:pk>/", SkillDetailView.as_view(), name="skill-detail"),
    path("my-skills/", MySkillListCreateView.as_view(), name="my-skill-list"),
    path("my-skills/<int:pk>/", MySkillDetailView.as_view(), name="my-skill-detail"),
    path("discover/", DiscoverView.as_view(), name="discover"),
]