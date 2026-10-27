import { apiClient } from './client';

export const availabilityApi = {
  // My slots
  async getMySlots() {
    return await apiClient('/availability/');
  },
  async createSlot({ weekday, start_time, end_time }) {
    return await apiClient('/availability/', {
      method: 'POST',
      body: { weekday, start_time, end_time },
    });
  },
  async updateSlot(id, data) {
    return await apiClient(`/availability/${id}/`, {
      method: 'PATCH',
      body: data,
    });
  },
  async deleteSlot(id) {
    return await apiClient(`/availability/${id}/`, {
      method: 'DELETE',
    });
  },

  // Peer slots
  async getUserSlots(userId) {
    return await apiClient(`/users/${userId}/availability/`);
  },

  // Common windows
  async getCommonWindows(userId, minMinutes = 30) {
    return await apiClient(`/availability/common/${userId}/?min_minutes=${minMinutes}`);
  },
};
