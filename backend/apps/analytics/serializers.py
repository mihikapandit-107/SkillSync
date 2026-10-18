from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    """Full user record for admins (includes email and account flags)."""

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "college",
                  "is_active", "is_staff", "is_superuser", "date_joined", "last_login")
        read_only_fields = fields


class AdminUserStatusSerializer(serializers.ModelSerializer):
    """PATCH body for moderation: only {"is_active": bool} is accepted."""
    is_active = serializers.BooleanField(required=True)

    class Meta:
        model = User
        fields = ("is_active",)

    def validate(self, attrs):
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError(
                {field: ["This field cannot be changed here."] for field in sorted(unknown)}
            )
        return attrs
