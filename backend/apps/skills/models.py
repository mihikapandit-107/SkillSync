from django.conf import settings
from django.db import models


class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserSkill(models.Model):
    class SkillType(models.TextChoices):
        OFFER = "offer", "Can teach"
        WANT = "want", "Wants to learn"

    class Level(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_skills"
    )
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="user_skills")
    skill_type = models.CharField(max_length=10, choices=SkillType.choices)
    level = models.CharField(max_length=15, choices=Level.choices, default=Level.BEGINNER)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "skill", "skill_type"], name="unique_user_skill_type"
            )
        ]

    def __str__(self):
        return f"{self.user} {self.skill_type} {self.skill}"


class SkillEndorsement(models.Model):
    """Peer student endorsement for a student's offered or wanted skill."""
    user_skill = models.ForeignKey(
        UserSkill, on_delete=models.CASCADE, related_name="endorsements"
    )
    endorser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="given_endorsements"
    )
    comment = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user_skill", "endorser"], name="unique_user_skill_endorsement"
            )
        ]

    def __str__(self):
        return f"{self.endorser.username} endorsed {self.user_skill.skill.name}"