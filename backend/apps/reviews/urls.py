from django.urls import path
from .views import ReviewListCreateView, ReviewDetailView, PendingReviewListView

urlpatterns = [
    path("reviews/", ReviewListCreateView.as_view(), name="review-list"),
    path("reviews/pending/", PendingReviewListView.as_view(), name="review-pending"),
    path("reviews/<int:pk>/", ReviewDetailView.as_view(), name="review-detail"),
]