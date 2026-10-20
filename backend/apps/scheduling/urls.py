from django.urls import path
from .views import (
    SessionListCreateView, SessionDetailView, SessionCancelView, SessionCompleteView,
)

urlpatterns = [
    path("sessions/", SessionListCreateView.as_view(), name="session-list"),
    path("sessions/<int:pk>/", SessionDetailView.as_view(), name="session-detail"),
    path("sessions/<int:pk>/cancel/", SessionCancelView.as_view(), name="session-cancel"),
    path("sessions/<int:pk>/complete/", SessionCompleteView.as_view(), name="session-complete"),
]