from django.contrib import admin
from .models import Skill, UserSkill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "created_at")
    search_fields = ("name", "category")


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ("user", "skill", "skill_type", "level")
    list_filter = ("skill_type", "level")
    search_fields = ("user__username", "skill__name")