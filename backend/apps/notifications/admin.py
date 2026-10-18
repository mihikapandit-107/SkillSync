from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "actor", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("recipient__username", "actor__username", "message")
    list_select_related = ("recipient", "actor")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
    raw_id_fields = ("recipient", "actor")
