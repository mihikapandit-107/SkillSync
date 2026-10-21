import { describe, it, expect } from 'vitest';
import { swapsApi } from '../api/swaps';
import { sessionsApi } from '../api/sessions';
import { reviewsApi } from '../api/review';
import { notificationsApi } from '../api/notifications';
import { matchesApi } from '../api/matches';
import { adminApi } from '../api/admin';
import { skillsApi } from '../api/skills';

describe('API modules interfaces', () => {
  it('swapsApi provides all swap lifecycle methods', () => {
    expect(typeof swapsApi.list).toBe('function');
    expect(typeof swapsApi.create).toBe('function');
    expect(typeof swapsApi.accept).toBe('function');
    expect(typeof swapsApi.reject).toBe('function');
    expect(typeof swapsApi.cancel).toBe('function');
  });

  it('sessionsApi provides session booking, schedule, and completion methods', () => {
    expect(typeof sessionsApi.list).toBe('function');
    expect(typeof sessionsApi.create).toBe('function');
    expect(typeof sessionsApi.update).toBe('function');
    expect(typeof sessionsApi.cancel).toBe('function');
    expect(typeof sessionsApi.complete).toBe('function');
  });

  it('reviewsApi provides review rating submission and pending reviews lookup', () => {
    expect(typeof reviewsApi.list).toBe('function');
    expect(typeof reviewsApi.getPending).toBe('function');
    expect(typeof reviewsApi.create).toBe('function');
    expect(typeof reviewsApi.get).toBe('function');
  });

  it('notificationsApi provides badge counts, mark read and dropdown utilities', () => {
    expect(typeof notificationsApi.list).toBe('function');
    expect(typeof notificationsApi.getUnreadCount).toBe('function');
    expect(typeof notificationsApi.markRead).toBe('function');
    expect(typeof notificationsApi.markAllRead).toBe('function');
  });

  it('matchesApi provides match algorithm scoring lookup with mutual & same college filters', () => {
    expect(typeof matchesApi.list).toBe('function');
  });

  it('adminApi provides session metrics, mentor ratings, and moderation endpoints', () => {
    expect(typeof adminApi.getOverview).toBe('function');
    expect(typeof adminApi.getSessions).toBe('function');
    expect(typeof adminApi.getTopRated).toBe('function');
    expect(typeof adminApi.getUsers).toBe('function');
    expect(typeof adminApi.deleteSkill).toBe('function');
    expect(typeof adminApi.deleteReview).toBe('function');
  });

  it('skillsApi provides discover and catalog query endpoints', () => {
    expect(typeof skillsApi.discoverSkills).toBe('function');
    expect(typeof skillsApi.getCatalogSkills).toBe('function');
    expect(typeof skillsApi.getMySkills).toBe('function');
    expect(typeof skillsApi.addMySkill).toBe('function');
    expect(typeof skillsApi.updateMySkill).toBe('function');
    expect(typeof skillsApi.deleteMySkill).toBe('function');
  });
});
