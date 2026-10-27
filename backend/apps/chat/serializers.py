from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.safety.services import is_blocked_between
from apps.swaps.models import SwapRequest
from apps.users.serializers import PublicUserSerializer
from .models import ChatMessage

User = get_user_model()


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    sender_detail = PublicUserSerializer(source="sender", read_only=True)
    recipient = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), write_only=True
    )
    recipient_detail = PublicUserSerializer(source="recipient", read_only=True)
    swap = serializers.PrimaryKeyRelatedField(
        queryset=SwapRequest.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = ChatMessage
        fields = (
            "id",
            "sender",
            "sender_detail",
            "recipient",
            "recipient_detail",
            "swap",
            "message",
            "is_read",
            "created_at",
        )
        read_only_fields = ("id", "sender", "is_read", "created_at")

    def validate(self, attrs):
        user = self.context["request"].user
        recipient = attrs.get("recipient")

        if recipient == user:
            raise serializers.ValidationError(
                {"recipient": "You cannot send messages to yourself."}
            )

        if is_blocked_between(user.pk, recipient.pk):
            raise serializers.ValidationError(
                {"recipient": "Cannot message this student due to account privacy settings."}
            )

        swap = attrs.get("swap")
        if swap and user.pk not in (swap.requester_id, swap.receiver_id):
            raise serializers.ValidationError(
                {"swap": "You are not a participant in this swap request."}
            )

        msg = attrs.get("message", "").strip()
        if not msg:
            raise serializers.ValidationError({"message": "Message text cannot be empty."})
        if len(msg) > 2000:
            raise serializers.ValidationError({"message": "Message exceeds 2000 characters limit."})

        return attrs
