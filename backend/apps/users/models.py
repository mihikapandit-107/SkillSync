from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    college = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)


class SavedPeer(models.Model):
    """Allows students to bookmark / save peer profiles to follow up or swap later."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="saved_peers"
    )
    peer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="saved_by_peers"
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "peer"], name="unique_user_saved_peer"
            )
        ]

    def __str__(self):
        return f"{self.user.username} saved {self.peer.username}"