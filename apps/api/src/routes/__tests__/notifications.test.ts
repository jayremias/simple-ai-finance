import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { app } from '@/index';
import { db } from '@/lib/db';
import { notification } from '@/lib/db/schema/notification';
import {
  bearerHeader,
  createAuthenticatedUser,
  createAuthenticatedUserWithOrg,
} from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type ErrorResponse = { error: { code: string; message: string } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestNotification(
  userId: string,
  overrides: Partial<{
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    navigateTo: string | null;
    metadata: string | null;
  }> = {}
) {
  const [created] = await db
    .insert(notification)
    .values({
      userId,
      type: overrides.type ?? 'system',
      title: overrides.title ?? 'Test Notification',
      message: overrides.message ?? 'This is a test notification',
      isRead: overrides.isRead ?? false,
      navigateTo: overrides.navigateTo ?? null,
      metadata: overrides.metadata ?? null,
    })
    .returning();

  if (!created) throw new Error('Failed to create test notification');
  return created;
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// GET /api/v1/notifications
// ---------------------------------------------------------------------------

describe('GET /api/v1/notifications', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/notifications', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  test('returns empty array when no notifications', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/notifications', {
      method: 'GET',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { notifications: unknown[] };
    expect(body.notifications).toEqual([]);
  });

  test('returns only the authenticated users notifications', async () => {
    const { user: user1, token: token1 } = await createAuthenticatedUserWithOrg();
    const { user: user2 } = await createAuthenticatedUserWithOrg();

    await createTestNotification(user1.id, { title: 'For user 1' });
    await createTestNotification(user2.id, { title: 'For user 2' });

    const res = await app.request('/api/v1/notifications', {
      method: 'GET',
      headers: bearerHeader(token1),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { notifications: { title: string }[] };
    expect(body.notifications.length).toBe(1);
    expect(body.notifications[0]?.title).toBe('For user 1');
  });

  test('returns unread notifications first', async () => {
    const { user, token } = await createAuthenticatedUserWithOrg();

    await createTestNotification(user.id, { title: 'Read one', isRead: true });
    await createTestNotification(user.id, { title: 'Unread one', isRead: false });

    const res = await app.request('/api/v1/notifications', {
      method: 'GET',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { notifications: { title: string; isRead: boolean }[] };
    expect(body.notifications.length).toBe(2);
    expect(body.notifications[0]?.isRead).toBe(false);
    expect(body.notifications[1]?.isRead).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/notifications/unread-count
// ---------------------------------------------------------------------------

describe('GET /api/v1/notifications/unread-count', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/notifications/unread-count', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  test('returns 0 when no unread notifications', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/notifications/unread-count', {
      method: 'GET',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(0);
  });

  test('returns correct unread count', async () => {
    const { user, token } = await createAuthenticatedUserWithOrg();

    await createTestNotification(user.id, { isRead: false });
    await createTestNotification(user.id, { isRead: false });
    await createTestNotification(user.id, { isRead: true });

    const res = await app.request('/api/v1/notifications/unread-count', {
      method: 'GET',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/notifications/:id/read', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/notifications/fake-id/read', { method: 'PATCH' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent notification', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request(`/api/v1/notifications/${crypto.randomUUID()}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(404);
  });

  test('returns 403 when marking another users notification', async () => {
    const { token: token1 } = await createAuthenticatedUserWithOrg();
    const { user: user2 } = await createAuthenticatedUserWithOrg();

    const otherNotification = await createTestNotification(user2.id);

    const res = await app.request(`/api/v1/notifications/${otherNotification.id}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token1),
    });

    expect(res.status).toBe(403);
  });

  test('marks notification as read', async () => {
    const { user, token } = await createAuthenticatedUserWithOrg();
    const testNotification = await createTestNotification(user.id);

    const res = await app.request(`/api/v1/notifications/${testNotification.id}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { isRead: boolean };
    expect(body.isRead).toBe(true);
  });

  test('is idempotent — marking already-read notification succeeds', async () => {
    const { user, token } = await createAuthenticatedUserWithOrg();
    const testNotification = await createTestNotification(user.id, { isRead: true });

    const res = await app.request(`/api/v1/notifications/${testNotification.id}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/read-all
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/notifications/read-all', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/notifications/read-all', { method: 'PATCH' });
    expect(res.status).toBe(401);
  });

  test('marks all unread notifications as read', async () => {
    const { user, token } = await createAuthenticatedUserWithOrg();

    await createTestNotification(user.id, { isRead: false });
    await createTestNotification(user.id, { isRead: false });
    await createTestNotification(user.id, { isRead: true });

    const res = await app.request('/api/v1/notifications/read-all', {
      method: 'PATCH',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(2);

    // Verify all are now read
    const countRes = await app.request('/api/v1/notifications/unread-count', {
      method: 'GET',
      headers: bearerHeader(token),
    });
    const countBody = (await countRes.json()) as { count: number };
    expect(countBody.count).toBe(0);
  });
});
