import { apiClient } from './client';

export const reviewsApi = {
  // list reviews. Query params: user (student id), session (session id), given (true/false), page
  async list({ user, session, given, page } = {}) {
    const query = new URLSearchParams();
    if (user) query.append('user', user);
    if (session) query.append('session', session);
    if (given) query.append('given', 'true');
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/reviews/${qs ? `?${qs}` : ''}`);
  },

  // List completed sessions of mine that I have not reviewed yet
  async getPending({ page } = {}) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    const qs = query.toString();
    return await apiClient(`/reviews/pending/${qs ? `?${qs}` : ''}`);
  },

  // Create a review for a completed session: { session: id, rating: 1..5, comment: string }
  async create({ session, rating, comment }) {
    return await apiClient('/reviews/', {
      method: 'POST',
      body: { session, rating: Number(rating), comment: (comment || '').trim() },
    });
  },

  async get(id) {
    return await apiClient(`/reviews/${id}/`);
  },
};

export const reviewApi = reviewsApi;
