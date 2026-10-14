import { apiClient } from './client';

export const skillsApi = {
  // Skill Catalog
  async getCatalogSkills(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.page) query.append('page', params.page);

    const queryString = query.toString();
    const endpoint = `/skills/${queryString ? `?${queryString}` : ''}`;
    const data = await apiClient(endpoint, { method: 'GET' });
    return data;
  },

  async createCatalogSkill(skillData) {
    return await apiClient('/skills/', {
      method: 'POST',
      body: skillData,
    });
  },

  async getCatalogSkillDetail(id) {
    return await apiClient(`/skills/${id}/`, {
      method: 'GET',
    });
  },

  // My Skills (Offered / Wanted)
  async getMySkills(type = null, page = null) {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    if (page) query.append('page', page);

    const queryString = query.toString();
    const endpoint = `/my-skills/${queryString ? `?${queryString}` : ''}`;
    return await apiClient(endpoint, { method: 'GET' });
  },

  async addMySkill(payload) {
    // payload: { skill: number, skill_type: 'offer' | 'want', level: 'beginner' | 'intermediate' | 'advanced', description: string }
    return await apiClient('/my-skills/', {
      method: 'POST',
      body: payload,
    });
  },

  async updateMySkill(id, payload) {
    return await apiClient(`/my-skills/${id}/`, {
      method: 'PATCH',
      body: payload,
    });
  },

  async deleteMySkill(id) {
    return await apiClient(`/my-skills/${id}/`, {
      method: 'DELETE',
    });
  },

  // Discovery (Browse Other Students' Skills)
  async discoverSkills(filters = {}) {
    // filters: { type: 'offer' | 'want', q: string, category: string, level: string, skill: number, page: number }
    const query = new URLSearchParams();
    if (filters.type) query.append('type', filters.type);
    if (filters.q) query.append('q', filters.q);
    if (filters.category) query.append('category', filters.category);
    if (filters.level) query.append('level', filters.level);
    if (filters.skill) query.append('skill', filters.skill);
    if (filters.page) query.append('page', filters.page);

    const queryString = query.toString();
    const endpoint = `/discover/${queryString ? `?${queryString}` : ''}`;
    return await apiClient(endpoint, { method: 'GET' });
  },
};
