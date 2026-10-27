from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import notify
from .models import Block, Report
from .serializers import AdminReportSerializer, BlockSerializer, ReportSerializer


# --------------------------------------------------------------------------- blocks

class BlockListCreateView(generics.ListCreateAPIView):
    """
    GET: students I have blocked (unpaginated, newest first).
    POST {"blocked": <user_id>}: block a student.
    """
    serializer_class = BlockSerializer
    pagination_class = None

    def get_queryset(self):
        return Block.objects.filter(blocker=self.request.user).select_related("blocked")

    def perform_create(self, serializer):
        serializer.save(blocker=self.request.user)


class BlockDeleteView(APIView):
    """DELETE /blocks/<user_id>/: unblock a student. 404 if not blocked."""

    def delete(self, request, user_id):
        block = get_object_or_404(Block, blocker=request.user, blocked_id=user_id)
        block.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- reports

class ReportListCreateView(generics.ListCreateAPIView):
    """
    GET: reports I have filed (paginated).
    POST {"reported_user", "reason", "details"}: file a report for staff review.
    """
    serializer_class = ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).select_related("reported_user")

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class AdminReportListView(generics.ListAPIView):
    """Staff: all reports. ?status=open|resolved|dismissed, ?user=<reported_user_id>."""
    serializer_class = AdminReportSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = Report.objects.select_related("reporter", "reported_user", "resolved_by")
        params = self.request.query_params

        status_param = params.get("status")
        if status_param:
            if status_param not in Report.Status.values:
                raise ValidationError(
                    {"status": [f"Must be one of: {', '.join(Report.Status.values)}."]}
                )
            qs = qs.filter(status=status_param)

        user_param = params.get("user")
        if user_param:
            try:
                qs = qs.filter(reported_user_id=int(user_param))
            except ValueError:
                raise ValidationError({"user": ["Must be an integer user id."]})
        return qs

    def get_serializer_context(self):
        # One grouped query for the "reports against this student" counter.
        ctx = super().get_serializer_context()
        ctx["report_counts"] = dict(
            Report.objects.values("reported_user_id")
            .annotate(n=Count("id"))
            .values_list("reported_user_id", "n")
        )
        return ctx


class AdminReportDetailView(generics.RetrieveUpdateAPIView):
    """Staff: view a report or close it with PATCH {"status": "resolved"|"dismissed", "admin_note"}."""
    serializer_class = AdminReportSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]
    queryset = Report.objects.select_related("reporter", "reported_user", "resolved_by")

    def perform_update(self, serializer):
        report = serializer.instance
        new_status = serializer.validated_data.get("status")
        note = serializer.validated_data.get("admin_note")

        if new_status is None:
            # Only the note changed.
            serializer.save()
            return
        if report.status != Report.Status.OPEN:
            raise ValidationError({"status": f"This report is already {report.status}."})

        report.resolve(self.request.user, new_status, note)
        outcome = "action was taken" if new_status == Report.Status.RESOLVED else "it was closed"
        notify(
            report.reporter, "system",
            f"Thanks for your report about {report.reported_user.username}: our team reviewed it and {outcome}.",
            target_type="report", target_id=report.pk,
        )
