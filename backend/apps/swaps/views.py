from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SwapRequest
from .serializers import SwapRequestSerializer


def my_swaps(user):
    """All swaps where the user is the sender or the receiver."""
    return (
        SwapRequest.objects
        .filter(Q(requester=user) | Q(receiver=user))
        .select_related("requester", "receiver", "offered_skill", "wanted_skill")
    )


class SwapListCreateView(generics.ListCreateAPIView):
    """
    GET: my swaps. ?box=sent|received (default: both), ?status=pending|accepted|...
    POST: send a new swap request.
    """
    serializer_class = SwapRequestSerializer

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params
        qs = my_swaps(user)

        box = params.get("box")
        if box == "sent":
            qs = qs.filter(requester=user)
        elif box == "received":
            qs = qs.filter(receiver=user)

        status = params.get("status")
        if status in SwapRequest.Status.values:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)


class SwapDetailView(generics.RetrieveAPIView):
    """View one swap. Non-participants get 404."""
    serializer_class = SwapRequestSerializer

    def get_queryset(self):
        return my_swaps(self.request.user)


class SwapTransitionView(APIView):
    """
    Base class for accept / reject / cancel.
    Subclasses set `actor` (who may do it) and `new_status`.
    """
    actor = None
    new_status = None

    def post(self, request, pk):
        swap = get_object_or_404(my_swaps(request.user), pk=pk)

        if getattr(swap, self.actor) != request.user:
            raise PermissionDenied(f"Only the {self.actor} can do this.")
        if swap.status != SwapRequest.Status.PENDING:
            raise ValidationError({"detail": f"This swap is already {swap.status}."})

        swap.transition(self.new_status)
        data = SwapRequestSerializer(swap, context={"request": request}).data
        return Response(data)


class SwapAcceptView(SwapTransitionView):
    actor = "receiver"
    new_status = SwapRequest.Status.ACCEPTED


class SwapRejectView(SwapTransitionView):
    actor = "receiver"
    new_status = SwapRequest.Status.REJECTED


class SwapCancelView(SwapTransitionView):
    actor = "requester"
    new_status = SwapRequest.Status.CANCELLED