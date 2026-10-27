from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.safety.services import is_blocked_between
from apps.skills.models import Skill, UserSkill
from apps.skills.serializers import SkillSerializer
from apps.users.serializers import PublicUserSerializer
from .models import SwapRequest

User = get_user_model()


class SwapRequestSerializer(serializers.ModelSerializer):
    # Write fields (IDs)
    receiver = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), write_only=True
    )
    offered_skill = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(), write_only=True
    )
    wanted_skill = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(), write_only=True
    )

    # Read fields (nested)
    requester_detail = PublicUserSerializer(source="requester", read_only=True)
    receiver_detail = PublicUserSerializer(source="receiver", read_only=True)
    offered_skill_detail = SkillSerializer(source="offered_skill", read_only=True)
    wanted_skill_detail = SkillSerializer(source="wanted_skill", read_only=True)

    class Meta:
        model = SwapRequest
        fields = (
            "id", "receiver", "offered_skill", "wanted_skill", "message",
            "requester_detail", "receiver_detail",
            "offered_skill_detail", "wanted_skill_detail",
            "status", "created_at", "updated_at", "responded_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at", "responded_at")

    def validate(self, attrs):
        user = self.context["request"].user
        receiver = attrs["receiver"]
        offered = attrs["offered_skill"]
        wanted = attrs["wanted_skill"]

        if receiver == user:
            raise serializers.ValidationError(
                {"receiver": "You cannot send a swap request to yourself."}
            )

        if is_blocked_between(user.pk, receiver.pk):
            raise serializers.ValidationError(
                {"receiver": "You can't send a swap request to this student."}
            )

        if not UserSkill.objects.filter(
            user=user, skill=offered, skill_type=UserSkill.SkillType.OFFER
        ).exists():
            raise serializers.ValidationError(
                {"offered_skill": "You can only offer a skill you have listed as 'offer'."}
            )

        if not UserSkill.objects.filter(
            user=receiver, skill=wanted, skill_type=UserSkill.SkillType.OFFER
        ).exists():
            raise serializers.ValidationError(
                {"wanted_skill": "This student does not offer that skill."}
            )

        if SwapRequest.objects.filter(
            requester=user, receiver=receiver, offered_skill=offered,
            wanted_skill=wanted, status=SwapRequest.Status.PENDING,
        ).exists():
            raise serializers.ValidationError(
                "You already have a pending request with these details."
            )
        return attrs