import { apiClient } from './client';

export const safetyApi = {
  // Blocks
  async getBlocks() {
    return await apiClient('/blocks/');
  },
  async blockUser(userId) {
    return await apiClient('/blocks/', {
      method: 'POST',
      body: { blocked: userId },
    });
  },
  async unblockUser(userId) {
    return await apiClient(`/blocks/${userId}/`, {
      method: 'DELETE',
    });
  },

  // Reports
  async getMyReports() {
    return await apiClient('/reports/');
  },
  async submitReport({ reported_user, reason, details }) {
    return await apiClient('/reports/', {
      method: 'POST',
      body: { reported_user, reason, details },
    });
  },

  // Admin reports
  async getAdminReports({ status, user, page } = {}) {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (user) query.append('user', user);
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/admin/reports/${qs ? `?${qs}` : ''}`);
  },
  async resolveReport(id, { status, admin_note }) {
    return await apiClient(`/admin/reports/${id}/`, {
      method: 'PATCH',
      body: { status, admin_note },
    });
  },
};
