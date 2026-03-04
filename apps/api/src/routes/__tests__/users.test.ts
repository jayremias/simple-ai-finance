import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { app } from '@/index';
import { bearerHeader, createAuthenticatedUser, createTestUser } from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

// Clean state between tests
beforeEach(async () => {
  await truncateAll();
});

// Ensure the last test cleans up too
afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------

describe('GET /api/v1/users/me', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/users/me');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('returns the authenticated user with default profile', async () => {
    const { user, token } = await createAuthenticatedUser({
      name: 'Alice',
      email: 'alice@example.com',
    });

    const res = await app.request('/api/v1/users/me', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(user.id);
    expect(body.name).toBe('Alice');
    expect(body.email).toBe('alice@example.com');
    expect(body.emailVerified).toBe(true);
    // Default profile values
    expect(body.defaultCurrency).toBe('USD');
    expect(body.locale).toBe('en-US');
  });

  test('creates profile on first fetch if not yet exists', async () => {
    const { token } = await createAuthenticatedUser();

    // No profile inserted — route should auto-create it
    const res = await app.request('/api/v1/users/me', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.defaultCurrency).toBe('USD');
    expect(body.locale).toBe('en-US');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/users/me', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob' }),
    });

    expect(res.status).toBe(401);
  });

  test('updates user name', async () => {
    const { token } = await createAuthenticatedUser({ name: 'Alice' });

    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Updated' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Alice Updated');
  });

  test('updates defaultCurrency', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultCurrency: 'BRL' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.defaultCurrency).toBe('BRL');
  });

  test('updates locale', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'pt-BR' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locale).toBe('pt-BR');
  });

  test('returns 400 for invalid currency', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultCurrency: 'EUR' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for empty name', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('allows partial updates — unset fields are not changed', async () => {
    const { token } = await createAuthenticatedUser({ name: 'Alice' });

    // Set locale
    await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'pt-BR' }),
    });

    // Update only name — locale should remain pt-BR
    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice v2' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Alice v2');
    expect(body.locale).toBe('pt-BR');
  });

  test('can clear image by setting it to null', async () => {
    const { token } = await createAuthenticatedUser();

    // Set an image
    await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'https://example.com/avatar.jpg' }),
    });

    // Clear it
    const res = await app.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: null }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image).toBeNull();
  });
});
