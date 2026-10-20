from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "reviewer", "reviewee", "rating", "session", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("reviewer__username", "reviewee__username", "comment")
    list_select_related = ("reviewer", "reviewee", "session")
    readonly_fields = ("created_at",)
    raw_id_fields = ("session", "reviewer", "reviewee")
    date_hierarchy = "created_at"