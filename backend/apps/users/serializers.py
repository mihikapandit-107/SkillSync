from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User
from django.apps import apps
from django.db.models import Avg, Count

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


def rating_summary(user):
    """Average rating and review count. Safe if the reviews app is unavailable."""
    try:
        Review = apps.get_model("reviews", "Review")
    except LookupError:
        return {"average_rating": None, "review_count": 0}
    agg = Review.objects.filter(reviewee=user).aggregate(avg=Avg("rating"), n=Count("pk"))
    avg = round(agg["avg"], 2) if agg["avg"] is not None else None
    return {"average_rating": avg, "review_count": agg["n"]}


class RatingFieldsMixin(serializers.Serializer):
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    def get_average_rating(self, obj):
        return rating_summary(obj)["average_rating"]

    def get_review_count(self, obj):
        return rating_summary(obj)["review_count"]


class UserSerializer(RatingFieldsMixin, serializers.ModelSerializer):
    """Full profile, used for the logged-in user's own data."""

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name",
                  "college", "bio", "date_joined", "is_staff", "is_superuser",
                  "average_rating", "review_count")
        read_only_fields = ("id", "date_joined", "is_staff", "is_superuser")


class PublicUserSerializer(serializers.ModelSerializer):
    """Limited profile for other students (no email)."""

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "college", "bio")


class PublicProfileSerializer(RatingFieldsMixin, PublicUserSerializer):
    """Single public profile page: adds rating info."""

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + ("average_rating", "review_count")