from django.contrib import admin

from .models import AvailabilitySlot


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "weekday", "start_time", "end_time")
    list_filter = ("weekday",)
    search_fields = ("user__username",)
    list_select_related = ("user",)
