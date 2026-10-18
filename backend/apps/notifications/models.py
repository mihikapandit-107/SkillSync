from django.conf import settings
from django.db import models


class Notification(models.Model):
    """An in-app notification for one recipient."""

    class Type(models.TextChoices):
        SWAP_REQUESTED = "swap_requested", "Swap requested"
        SWAP_ACCEPTED = "swap_accepted", "Swap accepted"
        SWAP_REJECTED = "swap_rejected", "Swap rejected"
        SWAP_CANCELLED = "swap_cancelled", "Swap cancelled"
        SESSION_SCHEDULED = "session_scheduled", "Session scheduled"
        SESSION_UPDATED = "session_updated", "Session updated"
        SESSION_CANCELLED = "session_cancelled", "Session cancelled"
        REVIEW_RECEIVED = "review_received", "Review received"
        SYSTEM = "system", "System"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    message = models.CharField(max_length=255)
    # Lightweight pointer to the related object, e.g. ("swap", 12).
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.PositiveIntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"], name="notif_recipient_read_idx"),
        ]

    def __str__(self):
        return f"{self.recipient} - {self.notification_type}"
