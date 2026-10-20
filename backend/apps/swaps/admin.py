from django.contrib import admin
from .models import SwapRequest


@admin.register(SwapRequest)
class SwapRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "requester", "receiver", "offered_skill",
                    "wanted_skill", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("requester__username", "receiver__username",
                     "offered_skill__name", "wanted_skill__name")
    list_select_related = ("requester", "receiver", "offered_skill", "wanted_skill")
    readonly_fields = ("created_at", "updated_at", "responded_at")
    date_hierarchy = "created_at"