from django.contrib import admin
from django.db.models import Count, Q
from .models import Skill, UserSkill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "offer_count", "want_count", "created_at")
    list_filter = ("category",)
    search_fields = ("name", "category")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)

    def get_queryset(self, request):
        # Counts are annotated once instead of queried per row.
        return super().get_queryset(request).annotate(
            _offer_count=Count("user_skills", filter=Q(user_skills__skill_type=UserSkill.SkillType.OFFER)),
            _want_count=Count("user_skills", filter=Q(user_skills__skill_type=UserSkill.SkillType.WANT)),
        )

    @admin.display(description="Offers", ordering="_offer_count")
    def offer_count(self, obj):
        return obj._offer_count

    @admin.display(description="Wants", ordering="_want_count")
    def want_count(self, obj):
        return obj._want_count


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ("user", "skill", "skill_type", "level", "created_at")
    list_filter = ("skill_type", "level", "skill__category")
    search_fields = ("user__username", "skill__name")
    list_select_related = ("user", "skill")
    autocomplete_fields = ("user", "skill")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)