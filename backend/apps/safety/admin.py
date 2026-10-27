from django.contrib import admin

from .models import Block, Report


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ("id", "blocker", "blocked", "created_at")
    search_fields = ("blocker__username", "blocked__username")
    list_select_related = ("blocker", "blocked")
    readonly_fields = ("created_at",)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "reporter", "reported_user", "reason", "status", "created_at", "resolved_by")
    list_filter = ("status", "reason")
    search_fields = ("reporter__username", "reported_user__username", "details")
    list_select_related = ("reporter", "reported_user", "resolved_by")
    readonly_fields = ("created_at", "resolved_at", "resolved_by")
    date_hierarchy = "created_at"
