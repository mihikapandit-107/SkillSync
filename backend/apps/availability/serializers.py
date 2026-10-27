from rest_framework import serializers

from .models import MAX_SLOTS_PER_USER, MIN_SLOT_MINUTES, AvailabilitySlot
from .services import minutes_of, slots_overlap


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    weekday_label = serializers.CharField(source="get_weekday_display", read_only=True)
    start_time = serializers.TimeField(format="%H:%M")
    end_time = serializers.TimeField(format="%H:%M")

    class Meta:
        model = AvailabilitySlot
        fields = ("id", "weekday", "weekday_label", "start_time", "end_time", "created_at")
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        user = self.context["request"].user
        instance = self.instance
        weekday = attrs.get("weekday", instance.weekday if instance else None)
        start = attrs.get("start_time", instance.start_time if instance else None)
        end = attrs.get("end_time", instance.end_time if instance else None)

        if start >= end:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        if minutes_of(end) - minutes_of(start) < MIN_SLOT_MINUTES:
            raise serializers.ValidationError(
                {"end_time": f"A slot must be at least {MIN_SLOT_MINUTES} minutes long."}
            )

        mine = AvailabilitySlot.objects.filter(user=user)
        if instance:
            mine = mine.exclude(pk=instance.pk)
        elif mine.count() >= MAX_SLOTS_PER_USER:
            raise serializers.ValidationError(
                f"You can have at most {MAX_SLOTS_PER_USER} availability slots."
            )

        for other in mine.filter(weekday=weekday):
            if slots_overlap(start, end, other.start_time, other.end_time):
                raise serializers.ValidationError({
                    "start_time": (
                        f"Overlaps your {other.get_weekday_display()} slot "
                        f"{other.start_time:%H:%M}-{other.end_time:%H:%M}."
                    )
                })
        return attrs
