from django.conf import settings
from django.db import models
from django.utils import timezone


class Block(models.Model):
    """`blocker` no longer wants any contact with `blocked`."""

    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_made"
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_received"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["blocker", "blocked"], name="block_unique_pair"),
            models.CheckConstraint(
                condition=~models.Q(blocker=models.F("blocked")), name="block_no_self"
            ),
        ]

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"


class Report(models.Model):
    """A student flags another student for staff review."""

    class Reason(models.TextChoices):
        SPAM = "spam", "Spam or scam"
        HARASSMENT = "harassment", "Harassment or bullying"
        INAPPROPRIATE = "inappropriate", "Inappropriate content"
        NO_SHOW = "no_show", "Repeatedly did not show up"
        FAKE_PROFILE = "fake_profile", "Fake profile"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Action taken"
        DISMISSED = "dismissed", "Dismissed"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_made"
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_received"
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    admin_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"], name="report_status_time_idx")]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(reporter=models.F("reported_user")), name="report_no_self"
            ),
            models.UniqueConstraint(
                fields=["reporter", "reported_user"],
                condition=models.Q(status="open"),
                name="report_one_open_per_pair",
            ),
        ]

    def __str__(self):
        return f"{self.reporter} reported {self.reported_user} ({self.reason}, {self.status})"

    def resolve(self, staff_user, status, note=None):
        """Close the report with `status` (resolved/dismissed) and record who did it."""
        self.status = status
        if note is not None:
            self.admin_note = note
        self.resolved_by = staff_user
        self.resolved_at = timezone.now()
        self.save(update_fields=["status", "admin_note", "resolved_by", "resolved_at"])
