from django.contrib.auth import get_user_model
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.safety.services import is_blocked_between
from .models import AvailabilitySlot
from .serializers import AvailabilitySlotSerializer
from .services import DEFAULT_MIN_MINUTES, common_windows

User = get_user_model()


def visible_student(request, pk):
    """Active student that the requester may see (not blocked either way), else 404."""
    other = get_object_or_404(User, pk=pk, is_active=True)
    if other.pk != request.user.pk and is_blocked_between(request.user.pk, other.pk):
        raise Http404
    return other


class MyAvailabilityListCreateView(generics.ListCreateAPIView):
    """GET: my weekly slots (unpaginated). POST: add a slot."""
    serializer_class = AvailabilitySlotSerializer
    pagination_class = None

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE one of my slots. Other students' slots return 404."""
    serializer_class = AvailabilitySlotSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(user=self.request.user)


class UserAvailabilityView(generics.ListAPIView):
    """GET /users/<pk>/availability/: another student's weekly slots."""
    serializer_class = AvailabilitySlotSerializer
    pagination_class = None

    def get_queryset(self):
        other = visible_student(self.request, self.kwargs["pk"])
        return AvailabilitySlot.objects.filter(user=other)


class CommonAvailabilityView(APIView):
    """
    GET /availability/common/<user_id>/?min_minutes=30
    Weekly windows when both me and that student are free.
    """

    def get(self, request, user_id):
        other = visible_student(request, user_id)
        if other.pk == request.user.pk:
            raise ValidationError({"detail": "Pick another student to compare with."})

        raw = request.query_params.get("min_minutes", DEFAULT_MIN_MINUTES)
        try:
            min_minutes = int(raw)
        except (TypeError, ValueError):
            raise ValidationError({"min_minutes": ["Must be an integer."]})
        if not 15 <= min_minutes <= 240:
            raise ValidationError({"min_minutes": ["Must be between 15 and 240."]})

        return Response({
            "user_id": other.pk,
            "min_minutes": min_minutes,
            "my_slot_count": AvailabilitySlot.objects.filter(user=request.user).count(),
            "their_slot_count": AvailabilitySlot.objects.filter(user=other).count(),
            "windows": common_windows(request.user, other, min_minutes),
        })
