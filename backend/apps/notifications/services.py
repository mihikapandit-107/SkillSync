"""
Notification service. Other apps should create notifications only via notify().
"""
import logging

from django.db import transaction

from .models import Notification

logger = logging.getLogger(__name__)


def notify(recipient, notification_type, message, actor=None, target_type="", target_id=None):
    """
    Create and return a Notification for `recipient`, or None if skipped/failed.

    - Skips self-notifications (recipient == actor).
    - Never raises into the caller: failures are logged. The insert runs in
      a savepoint so a DB error cannot break the caller's transaction.
    """
    if recipient is None:
        return None
    if actor is not None and getattr(actor, "pk", None) == getattr(recipient, "pk", None):
        return None
    try:
        with transaction.atomic():
            return Notification.objects.create(
                recipient=recipient,
                actor=actor,
                notification_type=notification_type,
                message=(message or "")[:255],
                target_type=target_type or "",
                target_id=target_id,
            )
    except Exception:  # noqa: BLE001 - notifications must never break a request
        logger.exception(
            "Failed to create %s notification for user %s",
            notification_type, getattr(recipient, "pk", recipient),
        )
        return None
