from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Session
from .serializers import SessionSerializer


def my_sessions(user):
    """Sessions of swaps where the user is the requester or the receiver."""
    return (
        Session.objects
        .filter(Q(swap__requester=user) | Q(swap__receiver=user))
        .select_related("swap", "swap__requester", "swap__receiver",
                        "swap__offered_skill", "swap__wanted_skill")
    )


class SessionListCreateView(generics.ListCreateAPIView):
    """
    GET: my sessions. ?status=scheduled|completed|cancelled, ?upcoming=true, ?swap=<id>
    POST: schedule a session for an accepted swap.
    """
    serializer_class = SessionSerializer

    def get_queryset(self):
        qs = my_sessions(self.request.user)
        params = self.request.query_params

        status = params.get("status")
        if status:
            if status not in Session.Status.values:
                raise ValidationError({"status": [f"Must be one of: {', '.join(Session.Status.values)}."]})
            qs = qs.filter(status=status)

        if params.get("upcoming", "").lower() == "true":
            qs = qs.filter(status=Session.Status.SCHEDULED, scheduled_at__gte=timezone.now())

        swap = params.get("swap")
        if swap:
            try:
                qs = qs.filter(swap_id=int(swap))
            except ValueError:
                raise ValidationError({"swap": ["Must be an integer swap id."]})
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SessionDetailView(generics.RetrieveUpdateAPIView):
    """GET a session, or PATCH time/duration/mode/location/notes (scheduled only)."""
    serializer_class = SessionSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return my_sessions(self.request.user)


class SessionActionView(APIView):
    """Base for cancel / complete. Participants only; scheduled sessions only."""

    def post(self, request, pk):
        session = get_object_or_404(my_sessions(request.user), pk=pk)
        if session.status != Session.Status.SCHEDULED:
            raise ValidationError({"detail": f"This session is already {session.status}."})
        self.apply(session, request.user)
        return Response(SessionSerializer(session, context={"request": request}).data)

    def apply(self, session, user):
        raise NotImplementedError


class SessionCancelView(SessionActionView):
    def apply(self, session, user):
        session.status = Session.Status.CANCELLED
        session.cancelled_by = user
        session.save(update_fields=["status", "cancelled_by", "updated_at"])


class SessionCompleteView(SessionActionView):
    def apply(self, session, user):
        if session.scheduled_at > timezone.now():
            raise ValidationError({"detail": "A session can only be completed after it has started."})
        session.status = Session.Status.COMPLETED
        session.save(update_fields=["status", "updated_at"])