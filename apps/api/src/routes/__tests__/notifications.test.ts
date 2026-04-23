import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { app } from '@/index';
import { createNotification } from '@/services/notifications.service';
import { bearerHeader, createAuthenticatedUser } from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type NotificationResponse = {
  id: string;
  type: string;
  status: 'read' | 'unread';
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

type ErrorResponse = { error: { code: string; message: string } };

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
    const response = await app.request('/api/v1/notifications');
    expect(response.status).toBe(401);
  });

  test('returns empty list when user has no notifications', async () => {
    const { token } = await createAuthenticatedUser();
    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(token),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: NotificationResponse[] };
    expect(body.data).toEqual([]);
  });

  test('returns notifications for the authenticated user', async () => {
    const { user, token } = await createAuthenticatedUser();
    await createNotification(user.id, 'account_invitation', 'You have been invited');
    await createNotification(user.id, 'system', 'Welcome to MoneyLens', {
      message: 'Get started by adding an account',
    });

    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(token),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: NotificationResponse[] };
    expect(body.data).toHaveLength(2);
  });

  test('returns notifications ordered by createdAt DESC (newest first)', async () => {
    const { user, token } = await createAuthenticatedUser();
    await createNotification(user.id, 'system', 'First');
    await createNotification(user.id, 'system', 'Second');

    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(token),
    });
    const body = (await response.json()) as { data: NotificationResponse[] };
    expect(body.data[0]?.title).toBe('Second');
    expect(body.data[1]?.title).toBe('First');
  });

  test('returns status unread for new notifications', async () => {
    const { user, token } = await createAuthenticatedUser();
    await createNotification(user.id, 'system', 'Unread notification');

    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(token),
    });
    const body = (await response.json()) as { data: NotificationResponse[] };
    expect(body.data[0]?.status).toBe('unread');
    expect(body.data[0]?.readAt).toBeNull();
  });

  test('does not return notifications belonging to another user', async () => {
    const { user: other } = await createAuthenticatedUser({ email: 'other@example.com' });
    await createNotification(other.id, 'system', 'Other user notification');

    const { token } = await createAuthenticatedUser({ email: 'me@example.com' });
    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(token),
    });
    const body = (await response.json()) as { data: NotificationResponse[] };
    expect(body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/notifications/:id/read', () => {
  test('returns 401 when not authenticated', async () => {
    const response = await app.request('/api/v1/notifications/some-id/read', {
      method: 'PATCH',
    });
    expect(response.status).toBe(401);
  });

  test('marks a notification as read', async () => {
    const { user, token } = await createAuthenticatedUser();
    const notification = await createNotification(user.id, 'system', 'Hello');
    if (!notification) throw new Error('Failed to create notification');

    const response = await app.request(`/api/v1/notifications/${notification.id}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify it appears as read when listed
    const listResponse = await app.request('/api/v1/notifications', {
      headers: bearerHeader(token),
    });
    const listBody = (await listResponse.json()) as { data: NotificationResponse[] };
    expect(listBody.data[0]?.status).toBe('read');
    expect(listBody.data[0]?.readAt).not.toBeNull();
  });

  test('returns 404 for non-existent notification', async () => {
    const { token } = await createAuthenticatedUser();
    const response = await app.request(`/api/v1/notifications/${crypto.randomUUID()}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token),
    });
    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('cannot mark another user notification as read', async () => {
    const { user: other } = await createAuthenticatedUser({ email: 'other2@example.com' });
    const notification = await createNotification(other.id, 'system', 'Private');
    if (!notification) throw new Error('Failed to create notification');

    const { token } = await createAuthenticatedUser({ email: 'attacker@example.com' });
    const response = await app.request(`/api/v1/notifications/${notification.id}/read`, {
      method: 'PATCH',
      headers: bearerHeader(token),
    });
    expect(response.status).toBe(404);
  });
});
