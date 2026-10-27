from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer
from .models import Block, Report

User = get_user_model()

MAX_DETAILS_LENGTH = 1000


class BlockSerializer(serializers.ModelSerializer):
    blocked = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    blocked_detail = PublicUserSerializer(source="blocked", read_only=True)

    class Meta:
        model = Block
        fields = ("id", "blocked", "blocked_detail", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_blocked(self, value):
        user = self.context["request"].user
        if value == user:
            raise serializers.ValidationError("You cannot block yourself.")
        if Block.objects.filter(blocker=user, blocked=value).exists():
            raise serializers.ValidationError("You have already blocked this student.")
        return value


class ReportSerializer(serializers.ModelSerializer):
    """What a student sees / sends. Staff-only fields are hidden."""

    reported_user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True
    )
    reported_user_detail = PublicUserSerializer(source="reported_user", read_only=True)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    details = serializers.CharField(
        required=False, allow_blank=True, max_length=MAX_DETAILS_LENGTH
    )

    class Meta:
        model = Report
        fields = (
            "id", "reported_user", "reported_user_detail", "reason", "reason_label",
            "details", "status", "status_label", "created_at", "resolved_at",
        )
        read_only_fields = ("id", "status", "created_at", "resolved_at")

    def validate(self, attrs):
        user = self.context["request"].user
        target = attrs["reported_user"]
        if target == user:
            raise serializers.ValidationError({"reported_user": "You cannot report yourself."})
        if Report.objects.filter(
            reporter=user, reported_user=target, status=Report.Status.OPEN
        ).exists():
            raise serializers.ValidationError(
                {"reported_user": "You already have an open report about this student."}
            )
        if attrs["reason"] == Report.Reason.OTHER and not attrs.get("details", "").strip():
            raise serializers.ValidationError(
                {"details": "Please describe the problem when choosing 'Other'."}
            )
        return attrs


class AdminReportSerializer(serializers.ModelSerializer):
    """Full report for staff. Only `status` and `admin_note` are editable."""

    reporter_detail = PublicUserSerializer(source="reporter", read_only=True)
    reported_user_detail = PublicUserSerializer(source="reported_user", read_only=True)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    resolved_by_username = serializers.CharField(
        source="resolved_by.username", read_only=True, default=None
    )
    reports_against_user = serializers.SerializerMethodField()
    reported_user_is_active = serializers.BooleanField(
        source="reported_user.is_active", read_only=True
    )

    class Meta:
        model = Report
        fields = (
            "id", "reporter_detail", "reported_user_detail", "reported_user_is_active",
            "reason", "reason_label", "details", "status", "status_label", "admin_note",
            "resolved_by_username", "resolved_at", "created_at", "reports_against_user",
        )
        read_only_fields = tuple(f for f in fields if f not in ("status", "admin_note"))

    def get_reports_against_user(self, obj):
        """How many reports (any status) this student has received in total."""
        counts = self.context.get("report_counts")
        if counts is not None:
            return counts.get(obj.reported_user_id, 0)
        return Report.objects.filter(reported_user_id=obj.reported_user_id).count()

    def validate_status(self, value):
        if value == Report.Status.OPEN:
            raise serializers.ValidationError("Choose 'resolved' or 'dismissed' to close a report.")
        return value
