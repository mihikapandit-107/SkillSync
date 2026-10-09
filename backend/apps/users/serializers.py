from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name",
                  "college", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Full profile, used for the logged-in user's own data."""

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name",
                  "college", "bio", "date_joined")
        read_only_fields = ("id", "date_joined")


class PublicUserSerializer(serializers.ModelSerializer):
    """Limited profile for other students (no email)."""

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "college", "bio")