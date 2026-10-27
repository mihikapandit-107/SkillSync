"""Overlap maths for weekly availability."""
from datetime import time

from .models import AvailabilitySlot

DEFAULT_MIN_MINUTES = 30


def minutes_of(t: time) -> int:
    """Minutes since midnight (seconds are ignored)."""
    return t.hour * 60 + t.minute


def _to_time(minutes: int) -> time:
    return time(minutes // 60, minutes % 60)


def _by_weekday(user):
    slots = {}
    for weekday, start, end in AvailabilitySlot.objects.filter(user=user).values_list(
        "weekday", "start_time", "end_time"
    ):
        slots.setdefault(weekday, []).append((minutes_of(start), minutes_of(end)))
    for intervals in slots.values():
        intervals.sort()
    return slots


def common_windows(user_a, user_b, min_minutes=DEFAULT_MIN_MINUTES):
    """
    Weekly windows when both students are free, at least `min_minutes` long.

    Returns a list of dicts ordered by weekday then start:
      {"weekday", "weekday_label", "start_time", "end_time", "minutes"}
    """
    mine, theirs = _by_weekday(user_a), _by_weekday(user_b)
    labels = dict(AvailabilitySlot.Weekday.choices)
    windows = []

    for weekday in sorted(set(mine) & set(theirs)):
        a, b = mine[weekday], theirs[weekday]
        i = j = 0
        # Classic two-pointer intersection of two sorted, disjoint interval lists.
        while i < len(a) and j < len(b):
            start = max(a[i][0], b[j][0])
            end = min(a[i][1], b[j][1])
            if end - start >= min_minutes:
                windows.append({
                    "weekday": weekday,
                    "weekday_label": labels[weekday],
                    "start_time": _to_time(start).strftime("%H:%M"),
                    "end_time": _to_time(end).strftime("%H:%M"),
                    "minutes": end - start,
                })
            if a[i][1] < b[j][1]:
                i += 1
            else:
                j += 1
    return windows


def slots_overlap(start_a, end_a, start_b, end_b):
    """True if [start_a, end_a) and [start_b, end_b) share any time."""
    return start_a < end_b and start_b < end_a
