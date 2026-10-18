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

## Admin & Analytics API

All endpoints require staff/admin authentication (`is_staff=True`). Requests must include `Authorization: Bearer <access_token>`. Anonymous requests return `401 Unauthorized`; non-staff requests return `403 Forbidden`.

### Endpoints Summary

| Method | Endpoint | Query params | Description |
|---|---|---|---|
| GET | `/api/admin/analytics/overview/` | – | High-level system statistics and integration status |
| GET | `/api/admin/analytics/popular-skills/` | `limit` (default 10, max 100), `type` (`offer`\|`want`) | Most offered/wanted skills across the platform |
| GET | `/api/admin/analytics/signups/` | `weeks` (default 12, max 52) | Weekly user signups (chronological, zero-filled) |
| GET | `/api/admin/analytics/sessions/` | `weeks` (default 12, max 52) | Weekly learning sessions (guarded cross-app integration) |
| GET | `/api/admin/analytics/top-rated/` | `limit` (default 10, max 100), `min_reviews` (default 1) | Highest rated students (guarded cross-app integration) |
| GET | `/api/admin/analytics/skill-gap/` | `limit` (default 10, max 100) | Skills with highest demand vs supply (`want_count - offer_count > 0`) |
| GET | `/api/admin/users/` | `search` (name, email, college), `is_active` (`true`\|`false`) | List user accounts with moderation details (paginated) |
| PATCH | `/api/admin/users/<id>/` | – | Deactivate or activate user account (`{"is_active": bool}`) |
| DELETE | `/api/admin/skills/<id>/` | – | Remove skill from catalog (cascades to UserSkill entries) |
| DELETE | `/api/admin/reviews/<id>/` | – | Remove abusive review (guarded cross-app integration) |

---

### Example JSON Responses

#### 1. Overview (`GET /api/admin/analytics/overview/`)
```json
{
  "total_users": 150,
  "active_users": 142,
  "new_users_last_7_days": 18,
  "total_skills": 45,
  "total_offers": 210,
  "total_wants": 185,
  "swaps_total": null,
  "swaps_by_status": null,
  "swap_success_rate": null,
  "sessions_total": null,
  "sessions_completed": null,
  "average_rating": null,
  "integrations": {
    "swaps": false,
    "sessions": false,
    "reviews": false
  }
}
```

#### 2. Popular Skills (`GET /api/admin/analytics/popular-skills/?limit=3&type=want`)
```json
{
  "results": [
    {
      "id": 5,
      "name": "Machine Learning",
      "category": "Data Science",
      "offer_count": 4,
      "want_count": 22,
      "total_count": 26
    },
    {
      "id": 12,
      "name": "React",
      "category": "Web Development",
      "offer_count": 8,
      "want_count": 19,
      "total_count": 27
    },
    {
      "id": 2,
      "name": "Guitar",
      "category": "Music",
      "offer_count": 3,
      "want_count": 15,
      "total_count": 18
    }
  ]
}
```

#### 3. Signups Over Time (`GET /api/admin/analytics/signups/?weeks=3`)
```json
{
  "weeks": 3,
  "results": [
    {
      "week_start": "2026-09-28",
      "count": 4
    },
    {
      "week_start": "2026-10-05",
      "count": 9
    },
    {
      "week_start": "2026-10-12",
      "count": 18
    }
  ]
}
```

#### 4. Sessions Over Time (`GET /api/admin/analytics/sessions/?weeks=12`)
```json
{
  "weeks": 12,
  "available": false,
  "results": []
}
```
*(Note: When `scheduling.Session` is available, `available` will be `true` with weekly session counts).*

#### 5. Top Rated Users (`GET /api/admin/analytics/top-rated/?limit=10`)
```json
{
  "available": false,
  "results": []
}
```
*(Note: When `reviews.Review` is available, `available` will be `true` with users ranked by average rating).*

#### 6. Skill Demand Gap (`GET /api/admin/analytics/skill-gap/?limit=2`)
```json
{
  "results": [
    {
      "id": 5,
      "name": "Machine Learning",
      "category": "Data Science",
      "offer_count": 4,
      "want_count": 22,
      "total_count": 26,
      "gap": 18
    },
    {
      "id": 12,
      "name": "React",
      "category": "Web Development",
      "offer_count": 8,
      "want_count": 19,
      "total_count": 27,
      "gap": 11
    }
  ]
}
```

#### 7. Moderation: User List (`GET /api/admin/users/?search=mit&is_active=true`)
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 4,
      "username": "student_user",
      "email": "student_user@example.com",
      "first_name": "Jane",
      "last_name": "Doe",
      "college": "MIT",
      "is_active": true,
      "is_staff": false,
      "is_superuser": false,
      "date_joined": "2026-10-18T08:15:00Z",
      "last_login": null
    }
  ]
}
```

#### 8. Moderation: Update User Status (`PATCH /api/admin/users/4/`)
Request:
```json
{
  "is_active": false
}
```
Response:
```json
{
  "id": 4,
  "username": "student_user",
  "email": "student_user@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "college": "MIT",
  "is_active": false,
  "is_staff": false,
  "is_superuser": false,
  "date_joined": "2026-10-18T08:15:00Z",
  "last_login": null
}
```
*(Protection: Admins cannot deactivate their own account or any superuser account; extra fields besides `is_active` are rejected with `400 Bad Request`).*

#### 9. Moderation: Delete Catalog Skill (`DELETE /api/admin/skills/1/`)
Response:
`204 No Content`
*(Note: Cascades and removes all student `UserSkill` offer/want entries referencing this skill).*

#### 10. Moderation: Delete Review (`DELETE /api/admin/reviews/1/`)
Response:
`404 Not Found` (when review model is not yet implemented) or `204 No Content` (when deleted).

---

### PowerShell Testing Commands

```powershell
# 1. Login as staff/admin user
$login = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/auth/login/" `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"<password>"}'

$headers = @{ Authorization = "Bearer $($login.access)" }

# 2. View Overview Analytics
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/admin/analytics/overview/" -Headers $headers

# 3. View Skill Demand Gaps
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/admin/analytics/skill-gap/?limit=5" -Headers $headers

# 4. Moderate User (Deactivate)
Invoke-RestMethod -Method Patch -Uri "http://127.0.0.1:8000/api/admin/users/4/" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"is_active": false}'
```
