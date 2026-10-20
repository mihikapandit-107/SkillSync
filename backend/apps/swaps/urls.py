from django.urls import path
from .views import (
    SwapListCreateView, SwapDetailView,
    SwapAcceptView, SwapRejectView, SwapCancelView,
)

urlpatterns = [
    path("swaps/", SwapListCreateView.as_view(), name="swap-list"),
    path("swaps/<int:pk>/", SwapDetailView.as_view(), name="swap-detail"),
    path("swaps/<int:pk>/accept/", SwapAcceptView.as_view(), name="swap-accept"),
    path("swaps/<int:pk>/reject/", SwapRejectView.as_view(), name="swap-reject"),
    path("swaps/<int:pk>/cancel/", SwapCancelView.as_view(), name="swap-cancel"),
]