from django.conf import settings
from django.db import models

from apps.swaps.models import SwapRequest


class ChatMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_messages"
    )
    swap = models.ForeignKey(
        SwapRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="chat_messages"
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["sender", "recipient", "created_at"], name="chat_pair_time_idx"),
            models.Index(fields=["recipient", "is_read"], name="chat_unread_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(sender=models.F("recipient")),
                name="chat_no_self_message",
            ),
        ]

    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.message[:30]}"
