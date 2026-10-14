// API Client with JWT management, auto token refresh, error formatting, and demo fallback

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function formatApiError(error) {
  if (error instanceof ApiError && error.data) {
    if (typeof error.data === 'string') return error.data;
    if (error.data.detail) return error.data.detail;
    // Django REST Framework field validation errors
    const fieldErrors = Object.entries(error.data)
      .map(([field, msgs]) => {
        const message = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
        return `${field.replace('_', ' ')}: ${message}`;
      })
      .join('\n');
    if (fieldErrors) return fieldErrors;
  }
  return error.message || 'An unexpected error occurred';
}

export const tokenStorage = {
  getAccess: () => localStorage.getItem('skillsync_access_token'),
  getRefresh: () => localStorage.getItem('skillsync_refresh_token'),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem('skillsync_access_token', access);
    if (refresh) localStorage.setItem('skillsync_refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('skillsync_access_token');
    localStorage.removeItem('skillsync_refresh_token');
    localStorage.removeItem('skillsync_demo_user');
  },
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function apiClient(endpoint, options = {}) {
  const { body, headers = {}, method = 'GET', requiresAuth = true, ...customConfig } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...customConfig,
  };

  const token = tokenStorage.getAccess();
  if (token && requiresAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    throw new ApiError(
      networkErr.message || 'Network connection failed',
      0,
      { detail: 'Could not connect to the backend server. Please verify Django is running at port 8000.' }
    );
  }

  // Handle 401 Unauthorized for token refresh
  if (response.status === 401 && requiresAuth && tokenStorage.getRefresh()) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          config.headers.Authorization = `Bearer ${newToken}`;
          return fetch(url, config).then(handleResponse);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokenStorage.getRefresh() }),
      });

      if (!refreshRes.ok) {
        tokenStorage.clearTokens();
        throw new ApiError('Session expired. Please log in again.', 401, null);
      }

      const refreshData = await refreshRes.json();
      tokenStorage.setTokens(refreshData.access, refreshData.refresh);
      processQueue(null, refreshData.access);

      config.headers.Authorization = `Bearer ${refreshData.access}`;
      return await fetch(url, config).then(handleResponse);
    } catch (err) {
      processQueue(err, null);
      tokenStorage.clearTokens();
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse(response);
}

async function handleResponse(response) {
  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === 'object' && (data.detail || JSON.stringify(data))) ||
      response.statusText ||
      'Request failed';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}
