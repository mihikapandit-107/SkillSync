import { apiClient } from './client';

export const achievementsApi = {
  async getMyAchievements() {
    return await apiClient('/achievements/me/');
  },
  async getUserAchievements(userId) {
    return await apiClient(`/achievements/users/${userId}/`);
  },
  async getLeaderboard({ limit = 10, college } = {}) {
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit);
    if (college) query.append('college', college);
    const qs = query.toString();
    return await apiClient(`/leaderboard/${qs ? `?${qs}` : ''}`);
  },
};
