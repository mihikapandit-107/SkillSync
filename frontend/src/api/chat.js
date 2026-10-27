import { apiClient } from './client';

export const chatApi = {
  // Get active conversations list
  async getConversations() {
    return await apiClient('/chat/conversations/');
  },

  // Get messages with a specific peer
  async getMessages(peerId) {
    return await apiClient(`/chat/messages/${peerId}/`);
  },

  // Send a message
  async sendMessage({ recipient, message, swap }) {
    return await apiClient('/chat/messages/', {
      method: 'POST',
      body: { recipient, message, swap },
    });
  },

  // Mark conversation as read
  async markAsRead(peerId) {
    return await apiClient(`/chat/conversations/${peerId}/read/`, {
      method: 'POST',
    });
  },
};
