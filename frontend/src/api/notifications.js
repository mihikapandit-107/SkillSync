import { apiClient } from './client';

export const notificationsApi = {
  async list({ is_read, type, page } = {}) {
    const query = new URLSearchParams();
    if (is_read !== undefined && is_read !== null) query.append('is_read', is_read);
    if (type) query.append('type', type);
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/notifications/${qs ? `?${qs}` : ''}`);
  },

  async getUnreadCount() {
    return await apiClient('/notifications/unread-count/');
  },

  async markRead(id) {
    return await apiClient(`/notifications/${id}/read/`, { method: 'POST' });
  },

  async markAllRead() {
    return await apiClient('/notifications/read-all/', { method: 'POST' });
  },

  async delete(id) {
    return await apiClient(`/notifications/${id}/`, { method: 'DELETE' });
  },
};
