from rest_framework import generics, filters
from .models import Skill, UserSkill
from .serializers import SkillSerializer, UserSkillSerializer, DiscoverSerializer


class SkillListCreateView(generics.ListCreateAPIView):
    """List the skill catalog (?search=, ?category=) or add a new skill."""
    serializer_class = SkillSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "category"]

    def get_queryset(self):
        qs = Skill.objects.all()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        return qs


class SkillDetailView(generics.RetrieveAPIView):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer


class MySkillListCreateView(generics.ListCreateAPIView):
    """The logged-in student's offered/wanted skills (?type=offer|want)."""
    serializer_class = UserSkillSerializer

    def get_queryset(self):
        qs = UserSkill.objects.filter(user=self.request.user).select_related("skill")
        skill_type = self.request.query_params.get("type")
        if skill_type in ("offer", "want"):
            qs = qs.filter(skill_type=skill_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MySkillDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSkillSerializer

    def get_queryset(self):
        # Users can only touch their own entries
        return UserSkill.objects.filter(user=self.request.user).select_related("skill")


class DiscoverView(generics.ListAPIView):
    """
    Browse other students' skills.
    Query params: ?type=offer|want (default offer), ?skill=<id>, ?q=<name>,
                  ?category=<cat>, ?level=<level>
    """
    serializer_class = DiscoverSerializer

    def get_queryset(self):
        params = self.request.query_params
        skill_type = params.get("type", "offer")

        qs = (
            UserSkill.objects
            .filter(skill_type=skill_type, user__is_active=True)
            .exclude(user=self.request.user)
            .select_related("user", "skill")
        )
        if params.get("skill"):
            qs = qs.filter(skill_id=params["skill"])
        if params.get("q"):
            qs = qs.filter(skill__name__icontains=params["q"])
        if params.get("category"):
            qs = qs.filter(skill__category__iexact=params["category"])
        if params.get("level"):
            qs = qs.filter(level=params["level"])
        return qs