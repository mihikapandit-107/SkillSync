from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor = PublicUserSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = ("id", "actor", "notification_type", "message",
                  "target_type", "target_id", "is_read", "created_at")
        read_only_fields = fields
