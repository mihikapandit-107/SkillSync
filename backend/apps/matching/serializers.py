from rest_framework import serializers

from apps.skills.serializers import SkillSerializer
from apps.users.serializers import PublicUserSerializer


class MatchSerializer(serializers.Serializer):
    """Read-only representation of one match dict from services.get_matches_for."""
    user = PublicUserSerializer(read_only=True)
    is_mutual = serializers.BooleanField(read_only=True)
    score = serializers.IntegerField(read_only=True)
    they_can_teach_you = SkillSerializer(many=True, read_only=True)
    you_can_teach_them = SkillSerializer(many=True, read_only=True)
