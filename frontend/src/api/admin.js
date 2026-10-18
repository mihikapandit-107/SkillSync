import { apiClient } from './client';

export const adminApi = {
  async getOverview() {
    return await apiClient('/admin/analytics/overview/');
  },

  async getPopularSkills(limit = 10, type = null) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (type) params.append('type', type);
    return await apiClient(`/admin/analytics/popular-skills/?${params.toString()}`);
  },

  async getSignups(weeks = 12) {
    return await apiClient(`/admin/analytics/signups/?weeks=${weeks}`);
  },

  async getSkillGap(limit = 10) {
    return await apiClient(`/admin/analytics/skill-gap/?limit=${limit}`);
  },

  async getUsers(search = '', isActive = null) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== null && isActive !== '') params.append('is_active', isActive);
    return await apiClient(`/admin/users/?${params.toString()}`);
  },

  async updateUserStatus(userId, isActive) {
    return await apiClient(`/admin/users/${userId}/`, {
      method: 'PATCH',
      body: { is_active: isActive },
    });
  },

  async deleteSkill(skillId) {
    return await apiClient(`/admin/skills/${skillId}/`, {
      method: 'DELETE',
    });
  },
};
