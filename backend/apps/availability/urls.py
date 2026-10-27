from django.urls import path

from .views import (
    CommonAvailabilityView, MyAvailabilityDetailView,
    MyAvailabilityListCreateView, UserAvailabilityView,
)

urlpatterns = [
    path("availability/", MyAvailabilityListCreateView.as_view(), name="availability-list"),
    path("availability/<int:pk>/", MyAvailabilityDetailView.as_view(), name="availability-detail"),
    path("availability/common/<int:user_id>/", CommonAvailabilityView.as_view(), name="availability-common"),
    path("users/<int:pk>/availability/", UserAvailabilityView.as_view(), name="user-availability"),
]
