# SkillSync

## Campus Skill Exchange & Peer Learning Platform

SkillSync is a web-based platform that allows college students to exchange skills, discover learning partners, schedule peer learning sessions, and share knowledge without monetary exchange.

## Technologies

- **Frontend**: React.js, Vite, Vanilla CSS Design System, Lucide Icons
- **Backend**: Django, Django REST Framework, SimpleJWT Authentication
- **Database**: SQLite
- **Version Control**: Git & GitHub

## Main Features

- **Student Authentication & Profiles**: Registration, JWT login, university affiliations, bio, and avatar support.
- **Skill Management**: Offer teaching skills and request learning goals with proficiency levels (Beginner, Intermediate, Advanced).
- **Skill Discovery**: Browse peers on campus, filter by category and skill level with server-side pagination.
- **Reciprocal Skill Matching**: Algorithm scoring mutual matches (peers who teach what you want to learn, and want what you teach).
- **Swap Requests**: Create, accept, decline, and cancel 1-on-1 skill swap requests.
- **Session Scheduling**: Coordinate online or in-person learning sessions with calendar dates, durations, and links.
- **Ratings & Reviews**: 1–5 star reviews with comments for completed peer sessions; verified peer rating averages.
- **Real-Time Notifications**: Unread notifications count badge, dropdown list, mark-as-read, and automatic event notifications.
- **Admin Dashboard**: Moderation of student accounts, catalog skills, and peer reviews, plus analytics on demand gaps, popular skills, weekly signups, and session trends.

## Project Structure

- `frontend/` – React application with Vite
- `backend/` – Django REST Framework backend

## Setup & Running Locally

### Backend Setup

```bash
cd backend

# Activate virtual environment
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate # Unix

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed starter skills into the catalog
python manage.py seed_skills
# (or load fixture: python manage.py loaddata apps/skills/fixtures/skills.json)

# Run server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

---

## Notifications API

All endpoints require `Authorization: Bearer <access>` and only ever act on the logged-in user's own notifications.

| Method | Endpoint | Query params | Response |
|---|---|---|---|
| GET | `/api/notifications/` | `is_read=true\|false`, `type=<notification_type>`, `page=<n>` | Paginated `{"count","next","previous","results"}`, newest first |
| GET | `/api/notifications/unread-count/` | – | `{"unread_count": 3}` |
| POST | `/api/notifications/<id>/read/` | – | The updated notification |
| POST | `/api/notifications/read-all/` | – | `{"updated": 3}` |
| DELETE | `/api/notifications/<id>/` | – | `204 No Content` |

`notification_type` is one of: `swap_requested`, `swap_accepted`, `swap_rejected`, `swap_cancelled`, `session_scheduled`, `session_updated`, `session_cancelled`, `review_received`, `system`.

### Notification Integration Status

Signal hooks connect automatically via Django signals in `apps.notifications.signals`:

| Hook | Status | Connected Model | Notifications Sent |
|---|---|---|---|
| Swap requests | ✅ Connected | `swaps.SwapRequest` | created (pending) → receiver `swap_requested`; accepted/rejected → requester `swap_accepted`/`swap_rejected`; cancelled → receiver `swap_cancelled` |
| Sessions | ✅ Connected | `scheduling.Session` | created → other participant `session_scheduled`; time/place changed → `session_updated`; cancelled → `session_cancelled` |
| Reviews | ✅ Connected | `reviews.Review` | created → reviewee `review_received` |

---

## Admin & Analytics API

All endpoints require staff/admin authentication (`is_staff=True`). Requests must include `Authorization: Bearer <access_token>`. Anonymous requests return `401 Unauthorized`; non-staff requests return `403 Forbidden`.

### Endpoints Summary

| Method | Endpoint | Query params | Description |
|---|---|---|---|
| GET | `/api/admin/analytics/overview/` | – | High-level system statistics and integration status |
| GET | `/api/admin/analytics/popular-skills/` | `limit`, `type` (`offer`\|`want`) | Most offered/wanted skills across the platform |
| GET | `/api/admin/analytics/signups/` | `weeks` | Weekly user signups (chronological, zero-filled) |
| GET | `/api/admin/analytics/sessions/` | `weeks` | Weekly learning sessions |
| GET | `/api/admin/analytics/top-rated/` | `limit`, `min_reviews` | Highest rated students |
| GET | `/api/admin/analytics/skill-gap/` | `limit` | Skills with highest demand vs supply (`want_count - offer_count > 0`) |
| GET | `/api/admin/users/` | `search`, `is_active`, `page` | List user accounts with moderation details (paginated) |
| PATCH | `/api/admin/users/<id>/` | – | Deactivate or activate user account (`{"is_active": bool}`) |
| DELETE | `/api/admin/skills/<id>/` | – | Remove skill from catalog (cascades to UserSkill entries) |
| DELETE | `/api/admin/reviews/<id>/` | – | Remove abusive review |

---

## Testing

### Backend Tests

```bash
cd backend
.\venv\Scripts\python manage.py test
```

### Frontend Lint & Tests

```bash
cd frontend
npm run lint
npm test
```
