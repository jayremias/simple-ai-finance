import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import type { TagResponse } from '@moneylens/shared';
import { app } from '@/index';
import {
  bearerHeader,
  createAuthenticatedUser,
  createAuthenticatedUserWithOrg,
} from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type ErrorResponse = { error: { code: string; message: string } };

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// POST /api/v1/tags
// ---------------------------------------------------------------------------

describe('POST /api/v1/tags', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'food' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();
    const res = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'food' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns 400 for invalid body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('creates a tag', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'business' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as TagResponse;
    expect(body.name).toBe('business');
    expect(body.id).toBeTruthy();
  });

  test('returns 409 for duplicate tag name in same org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'travel' }),
    });
    const res = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'travel' }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('DUPLICATE_TAG');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/tags
// ---------------------------------------------------------------------------

describe('GET /api/v1/tags', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/tags');
    expect(res.status).toBe(401);
  });

  test('returns list of tags', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'alpha' }),
    });
    await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'beta' }),
    });

    const res = await app.request('/api/v1/tags', { headers: bearerHeader(token) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TagResponse[];
    expect(body.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/tags/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/tags/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/tags/some-id', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent tag', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/tags/${crypto.randomUUID()}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('deletes a tag', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'toDelete' }),
    });
    const tag = (await createRes.json()) as TagResponse;

    const delRes = await app.request(`/api/v1/tags/${tag.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(delRes.status).toBe(200);

    const listRes = await app.request('/api/v1/tags', { headers: bearerHeader(token) });
    const list = (await listRes.json()) as TagResponse[];
    expect(list.length).toBe(0);
  });
});
