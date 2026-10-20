from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.scheduling.models import Session


class Review(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_given"
    )
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "reviewer"], name="review_one_per_session_reviewer"
            ),
            models.CheckConstraint(
                condition=~models.Q(reviewer=models.F("reviewee")),
                name="review_no_self_review",
            ),
        ]

    def __str__(self):
        return f"{self.reviewer} -> {self.reviewee}: {self.rating}/5"