import { apiClient, tokenStorage } from './client';

// Wrapper around /api/sessions/ endpoints.
export const sessionsApi = {
  async list({ status, upcoming, swap, page } = {}) {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (upcoming) query.append('upcoming', 'true');
    if (swap) query.append('swap', swap);
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/sessions/${qs ? `?${qs}` : ''}`);
  },

  // payload: { swap, scheduled_at (ISO string), duration_minutes, mode, location_or_link, notes }
  async create(payload) {
    return await apiClient('/sessions/', { method: 'POST', body: payload });
  },

  // Reschedule / edit details. Only works while the session is still "scheduled".
  async update(id, payload) {
    return await apiClient(`/sessions/${id}/`, { method: 'PATCH', body: payload });
  },

  async cancel(id) {
    return await apiClient(`/sessions/${id}/cancel/`, { method: 'POST' });
  },

  // Only allowed once the session start time has passed.
  async complete(id) {
    return await apiClient(`/sessions/${id}/complete/`, { method: 'POST' });
  },

  // Download iCalendar (.ics) invite for calendar apps (Google Calendar, Outlook, Apple Calendar)
  async downloadCalendarIcs(id) {
    const token = tokenStorage.getAccess();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`/api/sessions/${id}/calendar/`, { headers });
    if (!res.ok) {
      throw new Error('Failed to download calendar event');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillsync-session-${id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};