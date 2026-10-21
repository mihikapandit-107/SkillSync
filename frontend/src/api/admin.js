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

  async getSessions(weeks = 12) {
    return await apiClient(`/admin/analytics/sessions/?weeks=${weeks}`);
  },

  async getTopRated(limit = 10, minReviews = 1) {
    return await apiClient(`/admin/analytics/top-rated/?limit=${limit}&min_reviews=${minReviews}`);
  },

  async getSkillGap(limit = 10) {
    return await apiClient(`/admin/analytics/skill-gap/?limit=${limit}`);
  },

  async getUsers(search = '', isActive = null, page = 1) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== null && isActive !== '') params.append('is_active', isActive);
    if (page) params.append('page', page);
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

  async deleteReview(reviewId) {
    return await apiClient(`/admin/reviews/${reviewId}/`, {
      method: 'DELETE',
    });
  },
};
