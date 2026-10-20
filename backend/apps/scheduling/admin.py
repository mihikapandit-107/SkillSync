from django.contrib import admin
from .models import Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "swap", "scheduled_at", "duration_minutes", "mode", "status", "created_by")
    list_filter = ("status", "mode")
    search_fields = ("swap__requester__username", "swap__receiver__username", "location_or_link")
    list_select_related = ("swap", "swap__requester", "swap__receiver", "created_by")
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields = ("swap", "created_by", "cancelled_by")
    date_hierarchy = "scheduled_at"