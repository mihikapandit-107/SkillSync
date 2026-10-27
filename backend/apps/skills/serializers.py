from rest_framework import serializers
from apps.users.serializers import PublicUserSerializer
from .models import Skill, UserSkill, SkillEndorsement


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ("id", "name", "category")

    def validate_name(self, value):
        value = value.strip()
        qs = Skill.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This skill already exists.")
        return value


class UserSkillSerializer(serializers.ModelSerializer):
    """Used for a student managing their own offered/wanted skills."""
    skill = serializers.PrimaryKeyRelatedField(queryset=Skill.objects.all())
    skill_name = serializers.CharField(source="skill.name", read_only=True)
    endorsements_count = serializers.SerializerMethodField()

    class Meta:
        model = UserSkill
        fields = ("id", "skill", "skill_name", "skill_type", "level",
                  "description", "endorsements_count", "created_at")
        read_only_fields = ("id", "created_at")

    def get_endorsements_count(self, obj):
        return getattr(obj, "annotated_endorsements", obj.endorsements.count())

    def validate(self, attrs):
        user = self.context["request"].user
        skill = attrs.get("skill", getattr(self.instance, "skill", None))
        skill_type = attrs.get("skill_type", getattr(self.instance, "skill_type", None))

        qs = UserSkill.objects.filter(user=user, skill=skill, skill_type=skill_type)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "You have already added this skill with this type."
            )
        return attrs


class DiscoverSerializer(serializers.ModelSerializer):
    """Used for browsing other students' skills."""
    user = PublicUserSerializer(read_only=True)
    skill = SkillSerializer(read_only=True)
    endorsements_count = serializers.SerializerMethodField()
    is_endorsed = serializers.SerializerMethodField()

    class Meta:
        model = UserSkill
        fields = (
            "id", "user", "skill", "skill_type", "level", "description",
            "endorsements_count", "is_endorsed"
        )

    def get_endorsements_count(self, obj):
        return getattr(obj, "annotated_endorsements", obj.endorsements.count())

    def get_is_endorsed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.endorsements.filter(endorser=request.user).exists()
        return False


class SkillEndorsementSerializer(serializers.ModelSerializer):
    endorser_username = serializers.CharField(source="endorser.username", read_only=True)

    class Meta:
        model = SkillEndorsement
        fields = ("id", "user_skill", "endorser", "endorser_username", "comment", "created_at")
        read_only_fields = ("id", "endorser", "created_at")

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        user_skill = attrs.get("user_skill")
        if user and user_skill and user_skill.user == user:
            raise serializers.ValidationError("You cannot endorse your own skill.")
        return attrs