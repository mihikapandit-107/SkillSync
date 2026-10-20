from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.swaps.models import SwapRequest

MIN_DURATION = 15
MAX_DURATION = 240


class Session(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Mode(models.TextChoices):
        ONLINE = "online", "Online"
        IN_PERSON = "in_person", "In person"

    swap = models.ForeignKey(SwapRequest, on_delete=models.CASCADE, related_name="sessions")
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(MIN_DURATION), MaxValueValidator(MAX_DURATION)],
    )
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.ONLINE)
    location_or_link = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_sessions",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="cancelled_sessions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at"]
        indexes = [models.Index(fields=["status", "scheduled_at"], name="session_status_time_idx")]

    def __str__(self):
        return f"Session {self.pk} ({self.status}) at {self.scheduled_at:%Y-%m-%d %H:%M}"

    @property
    def end_at(self):
        return self.scheduled_at + timedelta(minutes=self.duration_minutes)

    def is_participant(self, user):
        return user.pk in (self.swap.requester_id, self.swap.receiver_id)