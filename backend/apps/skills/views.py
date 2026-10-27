from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Skill, UserSkill, SkillEndorsement
from .serializers import (
    DiscoverSerializer,
    SkillSerializer,
    UserSkillSerializer,
    SkillEndorsementSerializer,
)


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
    Invalid values return 400 instead of crashing.
    """
    serializer_class = DiscoverSerializer

    def get_queryset(self):
        params = self.request.query_params

        skill_type = params.get("type") or UserSkill.SkillType.OFFER
        if skill_type not in UserSkill.SkillType.values:
            raise ValidationError({"type": ["Must be 'offer' or 'want'."]})

        level = params.get("level")
        if level and level not in UserSkill.Level.values:
            raise ValidationError(
                {"level": [f"Must be one of: {', '.join(UserSkill.Level.values)}."]}
            )

        skill_id = None
        if params.get("skill"):
            try:
                skill_id = int(params["skill"])
            except ValueError:
                raise ValidationError({"skill": ["Must be an integer skill id."]})

        qs = (
            UserSkill.objects
            .filter(skill_type=skill_type, user__is_active=True)
            .exclude(user=self.request.user)
            .select_related("user", "skill")
        )
        if skill_id is not None:
            qs = qs.filter(skill_id=skill_id)
        if params.get("q"):
            qs = qs.filter(skill__name__icontains=params["q"])
        if params.get("category"):
            qs = qs.filter(skill__category__iexact=params["category"])
        if level:
            qs = qs.filter(level=level)
        return qs


class UserSkillEndorseToggleView(APIView):
    """POST /api/skills/user-skills/<int:pk>/endorse/ - Toggle peer endorsement."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user_skill = get_object_or_404(UserSkill, pk=pk)
        if user_skill.user == request.user:
            return Response(
                {"detail": "You cannot endorse your own listed skill."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get("comment", "").strip()
        existing = SkillEndorsement.objects.filter(user_skill=user_skill, endorser=request.user).first()
        if existing:
            existing.delete()
            endorsed = False
        else:
            SkillEndorsement.objects.create(
                user_skill=user_skill,
                endorser=request.user,
                comment=comment,
            )
            endorsed = True

        count = user_skill.endorsements.count()
        return Response({
            "endorsed": endorsed,
            "endorsements_count": count,
            "user_skill_id": user_skill.id,
        })


class UserSkillEndorsementListView(generics.ListAPIView):
    """GET /api/skills/user-skills/<int:pk>/endorsements/ - List endorsements for a skill."""
    serializer_class = SkillEndorsementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_skill = get_object_or_404(UserSkill, pk=self.kwargs["pk"])
        return user_skill.endorsements.select_related("endorser")