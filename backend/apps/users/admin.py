from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("college", "bio")}),
    )
    list_display = ("username", "email", "first_name", "last_name", "college",
                    "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff", "is_superuser", "date_joined")
    search_fields = ("username", "email", "first_name", "last_name", "college")
    date_hierarchy = "date_joined"
    readonly_fields = ("last_login", "date_joined")
    actions = ("deactivate_users", "activate_users")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        # Never lock out yourself or a superuser from a bulk action.
        protected = queryset.filter(pk=request.user.pk) | queryset.filter(is_superuser=True)
        skipped = protected.count()
        updated = queryset.exclude(pk__in=protected.values("pk")).update(is_active=False)
        self.message_user(request, f"Deactivated {updated} user(s).", messages.SUCCESS)
        if skipped:
            self.message_user(
                request, f"Skipped {skipped} user(s): yourself and superusers cannot be deactivated.",
                messages.WARNING,
            )

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"Activated {updated} user(s).", messages.SUCCESS)