"""
Signal handlers that turn swap / session / review events into notifications.

Guarded integration: swaps, scheduling and reviews may not define their
models yet. register_all() (called from NotificationsConfig.ready()) resolves
each model lazily with apps.get_model() and checks it has the fields these
handlers rely on. If the model or a field is missing, that hook is skipped
and logged; nothing is invented here.

Safety / idempotency:
  - raw saves (loaddata fixtures) are ignored;
  - "created" events are de-duplicated against existing notifications;
  - status changes fire only when the stored status actually changes
    (old value stashed in pre_save from the DB, not guessed);
  - receivers use dispatch_uid so they are never connected twice;
  - notify() never raises, so a failing notification cannot break a save.
Note: QuerySet.update() (e.g. bulk admin actions) bypasses signals by design.
"""
import logging

from django.apps import apps
from django.db.models.signals import post_save, pre_save

from .models import Notification
from .services import notify

logger = logging.getLogger(__name__)
T = Notification.Type

# Expected fields per integration (documented in README "Notification integration status").
SWAP_FIELDS = ("requester", "receiver", "status")
SESSION_FIELDS = ("swap", "status")
REVIEW_FIELDS = ("reviewer", "reviewee")
# Optional session fields used to identify who acted, if the model has them.
SESSION_CREATOR_FIELDS = ("created_by", "scheduled_by", "organizer")
SESSION_CANCELLER_FIELDS = ("cancelled_by",)


# --------------------------------------------------------------------------- helpers

def _resolve(app_label, model_name, required_fields):
    """Return the model if it exists and has all required fields, else None."""
    try:
        model = apps.get_model(app_label, model_name)
    except LookupError:
        logger.info("notifications: %s.%s not found; hook skipped.", app_label, model_name)
        return None
    names = {f.name for f in model._meta.get_fields()}
    missing = [f for f in required_fields if f not in names]
    if missing:
        logger.warning(
            "notifications: %s.%s is missing fields %s; hook skipped.",
            app_label, model_name, missing,
        )
        return None
    return model


def _first_attr(instance, names):
    for name in names:
        value = getattr(instance, name, None)
        if value is not None:
            return value
    return None


def _already_notified(recipient, notification_type, target_type, target_id):
    return Notification.objects.filter(
        recipient=recipient, notification_type=notification_type,
        target_type=target_type, target_id=target_id,
    ).exists()


def _name(user):
    return getattr(user, "username", None) or "Someone"


# --------------------------------------------------------------------------- swaps

def stash_swap_status(sender, instance, raw=False, **kwargs):
    """pre_save: remember the status currently stored in the DB."""
    if raw or not instance.pk:
        instance._notif_old_status = None
        return
    instance._notif_old_status = (
        sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    )


def swap_saved(sender, instance, created=False, raw=False, **kwargs):
    """post_save: swap requested / accepted / rejected / cancelled."""
    if raw:
        return
    requester, receiver = instance.requester, instance.receiver
    status = instance.status

    if created:
        if status == "pending" and not _already_notified(receiver, T.SWAP_REQUESTED, "swap", instance.pk):
            notify(receiver, T.SWAP_REQUESTED, f"{_name(requester)} sent you a swap request.",
                   actor=requester, target_type="swap", target_id=instance.pk)
        instance._notif_old_status = status
        return

    old = getattr(instance, "_notif_old_status", None)
    if old == status:
        return
    if status == "accepted":
        notify(requester, T.SWAP_ACCEPTED, f"{_name(receiver)} accepted your swap request.",
               actor=receiver, target_type="swap", target_id=instance.pk)
    elif status == "rejected":
        notify(requester, T.SWAP_REJECTED, f"{_name(receiver)} declined your swap request.",
               actor=receiver, target_type="swap", target_id=instance.pk)
    elif status == "cancelled":
        notify(receiver, T.SWAP_CANCELLED, f"{_name(requester)} cancelled their swap request.",
               actor=requester, target_type="swap", target_id=instance.pk)
    instance._notif_old_status = status  # a repeated save() of this instance won't re-fire


# --------------------------------------------------------------------------- sessions

def _session_detail_fields(model):
    """Concrete fields whose change counts as 'time/place changed'."""
    return [
        f.attname for f in model._meta.concrete_fields
        if not f.primary_key
        and f.name not in ("status", "swap", *SESSION_CREATOR_FIELDS, *SESSION_CANCELLER_FIELDS)
        and not getattr(f, "auto_now", False)
        and not getattr(f, "auto_now_add", False)
    ]


def stash_session_state(sender, instance, raw=False, **kwargs):
    """pre_save: remember stored status + detail fields."""
    instance._notif_old_values = None
    if raw or not instance.pk:
        return
    fields = ["status", *_session_detail_fields(sender)]
    instance._notif_old_values = sender.objects.filter(pk=instance.pk).values(*fields).first()


def _session_participants(session):
    swap = session.swap
    return [u for u in (getattr(swap, "requester", None), getattr(swap, "receiver", None)) if u]


def session_saved(sender, instance, created=False, raw=False, **kwargs):
    """post_save: session scheduled / updated / cancelled -> notify participants."""
    if raw:
        return
    participants = _session_participants(instance)

    if created:
        actor = _first_attr(instance, SESSION_CREATOR_FIELDS)
        for user in participants:
            if not _already_notified(user, T.SESSION_SCHEDULED, "session", instance.pk):
                notify(user, T.SESSION_SCHEDULED, f"{_name(actor)} scheduled a session with you."
                       if actor else "A new session was scheduled.",
                       actor=actor, target_type="session", target_id=instance.pk)
        return

    old = getattr(instance, "_notif_old_values", None)
    if not old:
        return
    if instance.status != old.get("status") and instance.status == "cancelled":
        actor = _first_attr(instance, SESSION_CANCELLER_FIELDS)
        for user in participants:
            notify(user, T.SESSION_CANCELLED, "A session was cancelled.",
                   actor=actor, target_type="session", target_id=instance.pk)
    elif any(getattr(instance, k) != v for k, v in old.items() if k != "status"):
        for user in participants:
            notify(user, T.SESSION_UPDATED, "A session's time or place was updated.",
                   target_type="session", target_id=instance.pk)
    # refresh the stash so a repeated save() doesn't re-fire
    instance._notif_old_values = {k: getattr(instance, k) for k in old}


# --------------------------------------------------------------------------- reviews

def review_saved(sender, instance, created=False, raw=False, **kwargs):
    """post_save: notify the reviewee about a new review."""
    if raw or not created:
        return
    reviewee, reviewer = instance.reviewee, instance.reviewer
    if _already_notified(reviewee, T.REVIEW_RECEIVED, "review", instance.pk):
        return
    rating = getattr(instance, "rating", None)
    suffix = f" ({rating}/5)" if rating is not None else ""
    notify(reviewee, T.REVIEW_RECEIVED, f"{_name(reviewer)} left you a review{suffix}.",
           actor=reviewer, target_type="review", target_id=instance.pk)


# --------------------------------------------------------------------------- wiring

def register_all():
    """Connect every hook whose model exists. Returns the list of connected hooks."""
    connected = []

    swap_model = _resolve("swaps", "SwapRequest", SWAP_FIELDS)
    if swap_model:
        pre_save.connect(stash_swap_status, sender=swap_model, dispatch_uid="notif_swap_pre")
        post_save.connect(swap_saved, sender=swap_model, dispatch_uid="notif_swap_post")
        connected.append("swaps.SwapRequest")
    # TODO(integration): swaps.SwapRequest does not exist yet. Hook expects fields
    # requester (FK user), receiver (FK user), status in pending/accepted/rejected/cancelled.

    session_model = _resolve("scheduling", "Session", SESSION_FIELDS)
    if session_model and swap_model:
        pre_save.connect(stash_session_state, sender=session_model, dispatch_uid="notif_session_pre")
        post_save.connect(session_saved, sender=session_model, dispatch_uid="notif_session_post")
        connected.append("scheduling.Session")
    elif session_model:
        logger.warning("notifications: Session hook needs swaps.SwapRequest for participants; skipped.")
    # TODO(integration): scheduling.Session does not exist yet. Hook expects fields
    # swap (FK SwapRequest), status in scheduled/completed/cancelled; optional
    # created_by/scheduled_by/organizer and cancelled_by (FK user) to identify the actor.

    review_model = _resolve("reviews", "Review", REVIEW_FIELDS)
    if review_model:
        post_save.connect(review_saved, sender=review_model, dispatch_uid="notif_review_post")
        connected.append("reviews.Review")
    # TODO(integration): reviews.Review does not exist yet. Hook expects fields
    # reviewer (FK user), reviewee (FK user); optional rating (1-5) used in the message.

    return connected
