import { describe, it, expect, beforeEach } from 'vitest';
import { ApiError, formatApiError, tokenStorage } from '../api/client';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (!globalThis.localStorage) {
  globalThis.localStorage = createStorageMock();
}

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves access and refresh tokens', () => {
    tokenStorage.setTokens('access-token-123', 'refresh-token-456');
    expect(tokenStorage.getAccess()).toBe('access-token-123');
    expect(tokenStorage.getRefresh()).toBe('refresh-token-456');
  });

  it('clears all auth and demo tokens upon clearTokens', () => {
    tokenStorage.setTokens('acc', 'ref');
    localStorage.setItem('skillsync_demo_user', '{"id": 1}');
    localStorage.setItem('skillsync_demo_active', 'true');

    tokenStorage.clearTokens();

    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(localStorage.getItem('skillsync_demo_user')).toBeNull();
    expect(localStorage.getItem('skillsync_demo_active')).toBeNull();
  });
});

describe('formatApiError', () => {
  it('formats detail error from ApiError', () => {
    const error = new ApiError('Forbidden', 403, { detail: 'You do not have permission to perform this action.' });
    expect(formatApiError(error)).toBe('You do not have permission to perform this action.');
  });

  it('formats DRF validation field errors', () => {
    const error = new ApiError('Bad Request', 400, {
      requested_skill: ['This field is required.'],
      offered_skill: ['You do not offer this skill.'],
    });
    const formatted = formatApiError(error);
    expect(formatted).toContain('requested skill: This field is required.');
    expect(formatted).toContain('offered skill: You do not offer this skill.');
  });

  it('handles plain string error data', () => {
    const error = new ApiError('Not Found', 404, 'Skill not found in database');
    expect(formatApiError(error)).toBe('Skill not found in database');
  });

  it('falls back to error message if no data exists', () => {
    const error = new Error('Network timeout');
    expect(formatApiError(error)).toBe('Network timeout');
  });
});
