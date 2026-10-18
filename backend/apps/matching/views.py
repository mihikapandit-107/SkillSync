from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .serializers import MatchSerializer
from .services import get_matches_for

TRUE_VALUES = {"true", "1", "yes"}
FALSE_VALUES = {"false", "0", "no", ""}


def _parse_bool(params, name):
    raw = params.get(name, "").strip().lower()
    if raw in TRUE_VALUES:
        return True
    if raw in FALSE_VALUES:
        return False
    raise ValidationError({name: ["Must be true or false."]})


class MatchListView(generics.ListAPIView):
    """
    GET /api/matches/ - suggested swap partners for the logged-in student.

    Query params:
      ?mutual_only=true   only mutual matches
      ?same_college=true  only students from my college
      ?skill=<skill_id>   only matches involving that skill
    Mutual matches come first, then by score desc, then username. Paginated.
    """
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Returns a plain list; DRF's paginator handles lists fine.
        params = self.request.query_params
        skill_id = None
        if params.get("skill"):
            try:
                skill_id = int(params["skill"])
            except ValueError:
                raise ValidationError({"skill": ["Must be an integer skill id."]})
        return get_matches_for(
            self.request.user,
            mutual_only=_parse_bool(params, "mutual_only"),
            same_college=_parse_bool(params, "same_college"),
            skill_id=skill_id,
        )
