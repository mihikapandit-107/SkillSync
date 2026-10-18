from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class MyNotificationsMixin:
    """Every view only ever sees the logged-in user's notifications."""
    permission_classes = [permissions.IsAuthenticated]

    def my_notifications(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationListView(MyNotificationsMixin, generics.ListAPIView):
    """
    GET /api/notifications/ - my notifications, newest first (paginated).
    Query params: ?is_read=true|false, ?type=<notification_type>
    """
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = self.my_notifications().select_related("actor")
        params = self.request.query_params

        is_read = params.get("is_read")
        if is_read is not None:
            value = is_read.strip().lower()
            if value not in ("true", "false"):
                raise ValidationError({"is_read": ["Must be true or false."]})
            qs = qs.filter(is_read=(value == "true"))

        ntype = params.get("type")
        if ntype:
            if ntype not in Notification.Type.values:
                raise ValidationError({"type": [f"Must be one of: {', '.join(Notification.Type.values)}."]})
            qs = qs.filter(notification_type=ntype)
        return qs


class UnreadCountView(MyNotificationsMixin, APIView):
    """GET /api/notifications/unread-count/ -> {"unread_count": N}"""

    def get(self, request):
        return Response({"unread_count": self.my_notifications().filter(is_read=False).count()})


class MarkReadView(MyNotificationsMixin, APIView):
    """POST /api/notifications/<id>/read/ - mark one of my notifications as read."""

    def post(self, request, pk):
        notification = get_object_or_404(self.my_notifications().select_related("actor"), pk=pk)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)


class ReadAllView(MyNotificationsMixin, APIView):
    """POST /api/notifications/read-all/ -> {"updated": N}"""

    def post(self, request):
        updated = self.my_notifications().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})


class NotificationDeleteView(MyNotificationsMixin, generics.DestroyAPIView):
    """DELETE /api/notifications/<id>/ - delete one of my notifications (404 if not mine)."""

    def get_queryset(self):
        return self.my_notifications()
