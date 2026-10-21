import { apiClient } from './client';

// Wrapper around /api/swaps/ endpoints.
export const swapsApi = {
  // box: 'sent' | 'received' | undefined (both); status: 'pending' | 'accepted' | ...
  async list({ box, status, page } = {}) {
    const query = new URLSearchParams();
    if (box) query.append('box', box);
    if (status) query.append('status', status);
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/swaps/${qs ? `?${qs}` : ''}`);
  },

  // payload: { receiver: userId, offered_skill: skillId, wanted_skill: skillId, message }
  async create(payload) {
    return await apiClient('/swaps/', { method: 'POST', body: payload });
  },

  // Receiver only
  async accept(id) {
    return await apiClient(`/swaps/${id}/accept/`, { method: 'POST' });
  },

  // Receiver only
  async reject(id) {
    return await apiClient(`/swaps/${id}/reject/`, { method: 'POST' });
  },

  // Requester only
  async cancel(id) {
    return await apiClient(`/swaps/${id}/cancel/`, { method: 'POST' });
  },
};