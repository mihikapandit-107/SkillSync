from rest_framework import generics
from rest_framework.exceptions import ValidationError

from apps.scheduling.models import Session
from apps.scheduling.serializers import SessionSerializer
from apps.scheduling.views import my_sessions
from .models import Review
from .serializers import ReviewSerializer


def _int_param(params, name):
    raw = params.get(name)
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except ValueError:
        raise ValidationError({name: ["Must be an integer."]})


class ReviewListCreateView(generics.ListCreateAPIView):
    """
    GET: reviews (newest first). ?user=<id> reviews received by that student,
         ?session=<id>, ?given=true only the reviews I wrote.
    POST: review the other participant of a completed session.
    """
    serializer_class = ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related("reviewer", "reviewee", "session")
        params = self.request.query_params

        user_id = _int_param(params, "user")
        if user_id is not None:
            qs = qs.filter(reviewee_id=user_id)
        session_id = _int_param(params, "session")
        if session_id is not None:
            qs = qs.filter(session_id=session_id)
        if params.get("given", "").lower() == "true":
            qs = qs.filter(reviewer=self.request.user)
        return qs


class ReviewDetailView(generics.RetrieveAPIView):
    queryset = Review.objects.select_related("reviewer", "reviewee", "session")
    serializer_class = ReviewSerializer


class PendingReviewListView(generics.ListAPIView):
    """Completed sessions of mine that I have not reviewed yet."""
    serializer_class = SessionSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            my_sessions(user)
            .filter(status=Session.Status.COMPLETED)
            .exclude(reviews__reviewer=user)
        )