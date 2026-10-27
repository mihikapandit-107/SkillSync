import re
from django.apps import apps
from django.contrib.auth.password_validation import validate_password
from django.db.models import Avg, Count
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, SavedPeer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enhanced login verification:
    - Allows students to log in using either their username or email address.
    - Verifies that the account is active.
    - Provides clean, descriptive validation error messages.
    """
    def validate(self, attrs):
        username_or_email = attrs.get(self.username_field, "").strip()
        password = attrs.get("password", "")

        if not username_or_email:
            raise serializers.ValidationError({"detail": "Username or student email is required."})
        if not password:
            raise serializers.ValidationError({"detail": "Password is required."})

        # If user entered an email, find corresponding username
        if "@" in username_or_email:
            matched_user = User.objects.filter(email__iexact=username_or_email).first()
            if matched_user:
                attrs[self.username_field] = matched_user.get_username()

        # Check if user exists and is active before authentication
        user_candidate = User.objects.filter(
            username__iexact=attrs.get(self.username_field)
        ).first()
        if user_candidate and not user_candidate.is_active:
            raise serializers.ValidationError({"detail": "This student account is inactive or has been suspended."})

        try:
            return super().validate(attrs)
        except Exception:
            raise serializers.ValidationError({"detail": "Invalid username/email or password."})


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name",
                  "college", "avatar_url", "password", "password2")
        extra_kwargs = {
            "avatar_url": {"required": False, "allow_blank": True},
        }

    def validate_email(self, value):
        val = value.strip().lower()
        if not val:
            raise serializers.ValidationError("Student email is required.")
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return val

    def validate_username(self, value):
        val = value.strip()
        if len(val) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r'^[a-zA-Z0-9_\-]+$', val):
            raise serializers.ValidationError("Username can only contain letters, numbers, underscores, and hyphens.")
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return val

    def validate_first_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("First name is required.")
        return val

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


def skill_lists(user):
    UserSkill = apps.get_model("skills", "UserSkill")
    result = {"offered_skills": [], "wanted_skills": []}
    rows = UserSkill.objects.filter(user=user).select_related("skill").order_by("skill__name")
    for row in rows:
        item = {
            "id": row.skill_id,
            "name": row.skill.name,
            "category": row.skill.category,
            "level": row.level,
        }
        key = "offered_skills" if row.skill_type == "offer" else "wanted_skills"
        result[key].append(item)
    return result

class RatingFieldsMixin(serializers.Serializer):
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    def get_average_rating(self, obj):
        return rating_summary(obj)["average_rating"]

    def get_review_count(self, obj):
        return rating_summary(obj)["review_count"]


class SkillListsMixin(serializers.Serializer):
    """Adds offered_skills / wanted_skills (one query per serialized user)."""
    offered_skills = serializers.SerializerMethodField()
    wanted_skills = serializers.SerializerMethodField()

    def _lists(self, obj):
        # Cache on the instance so both fields share a single query.
        if not hasattr(obj, "_skill_lists"):
            obj._skill_lists = skill_lists(obj)
        return obj._skill_lists

    def get_offered_skills(self, obj):
        return self._lists(obj)["offered_skills"]

    def get_wanted_skills(self, obj):
        return self._lists(obj)["wanted_skills"]


class UserSerializer(RatingFieldsMixin, SkillListsMixin, serializers.ModelSerializer):
    """Full profile, used for the logged-in user's own data."""

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name",
                  "college", "bio", "avatar_url", "date_joined", "is_staff", "is_superuser",
                  "average_rating", "review_count", "offered_skills", "wanted_skills")
        read_only_fields = ("id", "date_joined", "is_staff", "is_superuser")


class PublicUserSerializer(serializers.ModelSerializer):
    """Limited profile for other students (no email)."""

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "college", "bio", "avatar_url")


class PublicProfileSerializer(RatingFieldsMixin, SkillListsMixin, PublicUserSerializer):
    """Single public profile page: adds rating info and skill lists."""

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + (
            "average_rating", "review_count", "offered_skills", "wanted_skills",
        )


class SavedPeerSerializer(serializers.ModelSerializer):
    peer_detail = PublicProfileSerializer(source="peer", read_only=True)
    peer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), source="peer", write_only=True
    )

    class Meta:
        model = SavedPeer
        fields = ("id", "peer_id", "peer_detail", "note", "created_at")
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user == attrs.get("peer"):
            raise serializers.ValidationError({"peer_id": "You cannot bookmark your own profile."})
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        peer = validated_data["peer"]
        note = validated_data.get("note", "")
        saved, _ = SavedPeer.objects.update_or_create(
            user=user, peer=peer, defaults={"note": note}
        )
        return saved