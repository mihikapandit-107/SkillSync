from rest_framework import serializers

from apps.scheduling.models import Session
from apps.users.serializers import PublicUserSerializer
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    session = serializers.PrimaryKeyRelatedField(
        queryset=Session.objects.select_related("swap")
    )
    reviewer_detail = PublicUserSerializer(source="reviewer", read_only=True)
    reviewee_detail = PublicUserSerializer(source="reviewee", read_only=True)

    class Meta:
        model = Review
        fields = ("id", "session", "rating", "comment",
                  "reviewer_detail", "reviewee_detail", "created_at")
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        user = self.context["request"].user
        session = attrs["session"]

        if not session.is_participant(user):
            raise serializers.ValidationError({"session": "You did not take part in this session."})
        if session.status != Session.Status.COMPLETED:
            raise serializers.ValidationError(
                {"session": "You can only review a session after it is completed."}
            )
        if Review.objects.filter(session=session, reviewer=user).exists():
            raise serializers.ValidationError("You have already reviewed this session.")
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        swap = validated_data["session"].swap
        # The reviewee is always the other participant.
        reviewee_id = swap.receiver_id if user.pk == swap.requester_id else swap.requester_id
        return Review.objects.create(reviewer=user, reviewee_id=reviewee_id, **validated_data)