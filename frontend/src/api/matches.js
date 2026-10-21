import { apiClient } from './client';

export const matchesApi = {
  async list({ mutual_only, same_college, skill, page } = {}) {
    const query = new URLSearchParams();
    if (mutual_only !== undefined && mutual_only !== null && mutual_only !== '') {
      query.append('mutual_only', mutual_only);
    }
    if (same_college !== undefined && same_college !== null && same_college !== '') {
      query.append('same_college', same_college);
    }
    if (skill) query.append('skill', skill);
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/matches/${qs ? `?${qs}` : ''}`);
  },
};
