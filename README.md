\# SkillSync



\## Campus Skill Exchange \& Peer Learning Platform



SkillSync is a web-based platform that allows college students to

exchange skills, discover learning partners, schedule learning

sessions, and share knowledge without monetary exchange.



\## Technologies



\- React.js

\- Django

\- Django REST Framework

\- MySQL / SQLite

\- Git \& GitHub



\## Main Features



\- Student Registration \& Login

\- Student Profiles

\- Skill Management

\- Skill Discovery

\- Skill Matching

\- Swap Requests

\- Session Scheduling

\- Reviews \& Ratings

\- Notifications

\- Admin Dashboard

\- Analytics



\## Project Structure



\- `frontend/` – React frontend

\- `backend/` – Django backend



\## Team Members



\- Member 1 – Frontend

\- Member 2 – Backend

\- Member 3 – Admin \& Advanced Features


## Notifications API

All endpoints require `Authorization: Bearer <access>` and only ever act on the
logged-in user's own notifications (someone else's id returns `404`).

| Method | Endpoint | Query params | Response |
|---|---|---|---|
| GET | `/api/notifications/` | `is_read=true\|false`, `type=<notification_type>` | Paginated `{"count","next","previous","results"}`, newest first |
| GET | `/api/notifications/unread-count/` | – | `{"unread_count": 3}` |
| POST | `/api/notifications/<id>/read/` | – | The updated notification |
| POST | `/api/notifications/read-all/` | – | `{"updated": 3}` |
| DELETE | `/api/notifications/<id>/` | – | `204 No Content` |

`notification_type` is one of: `swap_requested`, `swap_accepted`, `swap_rejected`,
`swap_cancelled`, `session_scheduled`, `session_updated`, `session_cancelled`,
`review_received`, `system`.

Example item:

```json
{
  "id": 12,
  "actor": {"id": 2, "username": "bob", "first_name": "", "last_name": "", "college": "MIT", "bio": ""},
  "notification_type": "swap_requested",
  "message": "bob sent you a swap request.",
  "target_type": "swap",
  "target_id": 7,
  "is_read": false,
  "created_at": "2026-10-18T08:15:00Z"
}
```

`actor` is `null` for system notifications. `target_type` + `target_id` point to
the related object (`swap`, `session`, `review`) so the frontend can link to it.

Creating notifications from other apps:

```python
from apps.notifications.services import notify
notify(recipient, "system", "Welcome to SkillSync!", actor=None, target_type="", target_id=None)
```

`notify()` skips self-notifications (recipient == actor) and never raises: failures are logged.

Quick manual check (PowerShell):

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/auth/login/ -ContentType "application/json" -Body '{"username":"alice","password":"<password>"}'
$h = @{ Authorization = "Bearer $($login.access)" }
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/notifications/unread-count/ -Headers $h
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/notifications/read-all/ -Headers $h
```

## Notification integration status

Hooks live in `backend/apps/notifications/signals.py` and are connected in
`NotificationsConfig.ready()`. Each hook resolves its model lazily with
`apps.get_model()` and is **only connected if the model exists and has the
expected fields**; otherwise it is skipped (logged) and nothing breaks.

| Hook | Status | Expected model & fields | Notifications sent |
|---|---|---|---|
| Swap requests | ⏳ Pending: `swaps.SwapRequest` not built yet | `requester` (FK user), `receiver` (FK user), `status` ∈ `pending/accepted/rejected/cancelled` | created (pending) → receiver `swap_requested`; → accepted/rejected → requester `swap_accepted`/`swap_rejected`; → cancelled → receiver `swap_cancelled` |
| Sessions | ⏳ Pending: `scheduling.Session` not built yet (also needs `SwapRequest`) | `swap` (FK SwapRequest), `status` ∈ `scheduled/completed/cancelled`; optional `created_by`/`scheduled_by`/`organizer` and `cancelled_by` (FK user) | created → other participant `session_scheduled`; any other concrete field changed (time/place) → `session_updated`; → cancelled → `session_cancelled` |
| Reviews | ⏳ Pending: `reviews.Review` not built yet | `reviewer` (FK user), `reviewee` (FK user); optional `rating` | created → reviewee `review_received` |

Once a teammate adds one of these models with the fields above, restart the
server: the hook connects automatically. If field names differ, update the
`*_FIELDS` constants and handlers in `signals.py` and remove the matching
`TODO(integration)` comment. Handlers ignore fixture (`raw`) saves, de-duplicate
"created" notifications, and fire on status changes only when the stored value
actually changes. Note that `QuerySet.update()` bypasses signals.
