from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.skills.models import Skill


class SwapRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_swaps"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_swaps"
    )
    offered_skill = models.ForeignKey(
        Skill, on_delete=models.CASCADE, related_name="swaps_as_offered"
    )
    wanted_skill = models.ForeignKey(
        Skill, on_delete=models.CASCADE, related_name="swaps_as_wanted"
    )
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(requester=models.F("receiver")),
                name="swap_no_self_request",
            ),
            models.UniqueConstraint(
                fields=["requester", "receiver", "offered_skill", "wanted_skill"],
                condition=models.Q(status="pending"),
                name="swap_unique_pending_request",
            ),
        ]

    def __str__(self):
        return f"{self.requester} -> {self.receiver} ({self.status})"

    def transition(self, new_status):
        """Move to a new status and record when it happened."""
        self.status = new_status
        self.responded_at = timezone.now()
        self.save(update_fields=["status", "responded_at", "updated_at"])