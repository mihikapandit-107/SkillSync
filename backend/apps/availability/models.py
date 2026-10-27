from django.conf import settings
from django.db import models

MAX_SLOTS_PER_USER = 28
MIN_SLOT_MINUTES = 15


class AvailabilitySlot(models.Model):
    """
    A recurring weekly window when a student is free to meet.

    Times are campus wall-clock times (no timezone): "Mondays 16:00-18:00".
    A student's own slots never overlap on the same weekday (enforced in the
    serializer), so overlap maths in services.py can treat them as disjoint.
    """

    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="availability_slots"
    )
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        indexes = [models.Index(fields=["user", "weekday"], name="avail_user_weekday_idx")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_time__lt=models.F("end_time")),
                name="avail_start_before_end",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} {self.get_weekday_display()} "
            f"{self.start_time:%H:%M}-{self.end_time:%H:%M}"
        )
