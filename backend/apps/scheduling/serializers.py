from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from apps.swaps.models import SwapRequest
from apps.swaps.serializers import SwapRequestSerializer
from .models import MAX_DURATION, Session


class SessionSerializer(serializers.ModelSerializer):
    swap = serializers.PrimaryKeyRelatedField(
        queryset=SwapRequest.objects.select_related("requester", "receiver")
    )
    swap_detail = SwapRequestSerializer(source="swap", read_only=True)
    end_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Session
        fields = (
            "id", "swap", "swap_detail", "scheduled_at", "end_at", "duration_minutes",
            "mode", "location_or_link", "notes", "status",
            "created_by", "cancelled_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "status", "created_by", "cancelled_by",
                            "created_at", "updated_at")

    def validate(self, attrs):
        user = self.context["request"].user
        instance = self.instance
        swap = attrs.get("swap", instance.swap if instance else None)

        if instance:
            if swap != instance.swap:
                raise serializers.ValidationError({"swap": "The swap of a session cannot be changed."})
            if instance.status != Session.Status.SCHEDULED:
                raise serializers.ValidationError(
                    f"This session is already {instance.status} and cannot be changed."
                )
        else:
            if user.pk not in (swap.requester_id, swap.receiver_id):
                raise serializers.ValidationError({"swap": "You are not part of this swap."})
            if swap.status != SwapRequest.Status.ACCEPTED:
                raise serializers.ValidationError(
                    {"swap": "Sessions can only be scheduled for accepted swaps."}
                )

        start = attrs.get("scheduled_at", instance.scheduled_at if instance else None)
        minutes = attrs.get("duration_minutes", instance.duration_minutes if instance else 60)
        location = attrs.get("location_or_link", instance.location_or_link if instance else "")

        if "scheduled_at" in attrs and start <= timezone.now():
            raise serializers.ValidationError({"scheduled_at": "The session must be in the future."})
        if not (location or "").strip():
            raise serializers.ValidationError(
                {"location_or_link": "Provide a meeting link or a location."}
            )
        self._check_overlap(swap, start, minutes, exclude_pk=instance.pk if instance else None)
        return attrs

    @staticmethod
    def _check_overlap(swap, start, minutes, exclude_pk=None):
        """Neither participant may have another scheduled session at the same time."""
        end = start + timedelta(minutes=minutes)
        users = [swap.requester_id, swap.receiver_id]
        qs = (
            Session.objects
            .filter(
                status=Session.Status.SCHEDULED,
                scheduled_at__gt=start - timedelta(minutes=MAX_DURATION),
                scheduled_at__lt=end,
            )
            .filter(Q(swap__requester_id__in=users) | Q(swap__receiver_id__in=users))
        )
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        for other in qs:
            if other.scheduled_at < end and other.end_at > start:
                raise serializers.ValidationError(
                    {"scheduled_at": "One of the participants already has a session at this time."}
                )