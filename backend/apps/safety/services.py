"""
Block helpers used by other apps (swaps, matching, availability).

A block works in both directions: if A blocked B, neither can send the
other a swap request or see each other in matches.
"""
from django.db.models import Q

from .models import Block


def blocked_user_ids(user):
    """Ids of every user that `user` blocked or was blocked by."""
    if not getattr(user, "pk", None):
        return set()
    ids = set()
    for blocker_id, blocked_id in Block.objects.filter(
        Q(blocker=user) | Q(blocked=user)
    ).values_list("blocker_id", "blocked_id"):
        ids.add(blocked_id if blocker_id == user.pk else blocker_id)
    return ids


def is_blocked_between(user_a_id, user_b_id):
    """True if either user has blocked the other."""
    if not user_a_id or not user_b_id:
        return False
    return Block.objects.filter(
        Q(blocker_id=user_a_id, blocked_id=user_b_id)
        | Q(blocker_id=user_b_id, blocked_id=user_a_id)
    ).exists()


def exclude_blocked(queryset, user, field="user_id"):
    """
    Drop rows whose `field` is a user blocked by / blocking `user`.
    Uses subqueries, so it adds no extra database round-trip.
    """
    if not getattr(user, "pk", None):
        return queryset
    return queryset.exclude(
        **{f"{field}__in": Block.objects.filter(blocker=user).values("blocked_id")}
    ).exclude(
        **{f"{field}__in": Block.objects.filter(blocked=user).values("blocker_id")}
    )
