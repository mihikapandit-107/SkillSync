from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    MeView,
    UserDetailView,
    UserSkillsView,
    CustomTokenObtainPairView,
    SavedPeerListCreateView,
    SavedPeerDeleteView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("users/me/", MeView.as_view(), name="me"),
    path("users/saved/", SavedPeerListCreateView.as_view(), name="saved-peers"),
    path("users/saved/<int:peer_id>/", SavedPeerDeleteView.as_view(), name="saved-peer-delete"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/skills/", UserSkillsView.as_view(), name="user-skills"),
]