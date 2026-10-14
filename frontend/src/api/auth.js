import { apiClient, tokenStorage } from './client';

export const authApi = {
  async register(userData) {
    const data = await apiClient('/auth/register/', {
      method: 'POST',
      body: userData,
      requiresAuth: false,
    });
    return data;
  },

  async login(credentials) {
    const data = await apiClient('/auth/login/', {
      method: 'POST',
      body: credentials,
      requiresAuth: false,
    });
    tokenStorage.setTokens(data.access, data.refresh);
    return data;
  },

  logout() {
    tokenStorage.clearTokens();
  },

  async getMe() {
    return await apiClient('/users/me/', {
      method: 'GET',
    });
  },

  async updateMe(profileData) {
    return await apiClient('/users/me/', {
      method: 'PATCH',
      body: profileData,
    });
  },

  async getUserDetail(userId) {
    return await apiClient(`/users/${userId}/`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};
