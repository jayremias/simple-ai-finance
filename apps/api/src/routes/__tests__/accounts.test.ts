import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import type { AccountResponse } from '@moneylens/shared';
import { app } from '@/index';
import {
  bearerHeader,
  createAuthenticatedUser,
  createAuthenticatedUserWithOrg,
  createTestOrg,
  createTestSession,
  createTestUser,
  setActiveOrg,
} from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type ErrorResponse = { error: { code: string; message: string } };

const VALID_ACCOUNT = {
  name: 'Checking Account',
  type: 'checking',
  currency: 'USD',
  initial_balance: 10000,
  color: '#4F46E5',
} as const;

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// POST /api/v1/accounts
// ---------------------------------------------------------------------------

describe('POST /api/v1/accounts', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });

    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns 403 when user is not a member of the org', async () => {
    const { token } = await createAuthenticatedUser();
    // Create a different user's org and set it as active (user is not a member)
    const other = await createTestUser({ email: 'other@example.com' });
    const org = await createTestOrg(other.id);
    await setActiveOrg(token, org.id);

    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('FORBIDDEN');
  });

  test('returns 403 when user role is viewer', async () => {
    const owner = await createTestUser({ email: 'owner@example.com' });
    const org = await createTestOrg(owner.id);

    // Create a viewer user in the same org
    const viewer = await createTestUser({ email: 'viewer@example.com' });
    const { db } = await import('@/lib/db');
    const { member } = await import('@/lib/db/schema/organization');
    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: viewer.id,
      role: 'viewer',
      createdAt: new Date(),
    });
    const token = await createTestSession(viewer.id, { activeOrganizationId: org.id });

    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });

    expect(res.status).toBe(403);
  });

  test('returns 400 for invalid body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', type: 'checking', currency: 'USD' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for unsupported currency', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_ACCOUNT, currency: 'EUR' }),
    });

    expect(res.status).toBe(400);
  });

  test('creates account and returns 201', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as AccountResponse;
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Checking Account');
    expect(body.type).toBe('checking');
    expect(body.currency).toBe('USD');
    expect(body.initialBalance).toBe(10000);
    expect(body.color).toBe('#4F46E5');
    expect(body.status).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/accounts
// ---------------------------------------------------------------------------

describe('GET /api/v1/accounts', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts');
    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/accounts', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(400);
  });

  test('returns empty array when no accounts exist', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/accounts', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as AccountResponse[];
    expect(body).toEqual([]);
  });

  test('returns created accounts', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });

    const res = await app.request('/api/v1/accounts', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as AccountResponse[];
    expect(body).toHaveLength(1);
    expect(body[0]?.name).toBe('Checking Account');
  });

  test('filters by status', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    // Create an active account
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    // Archive it
    await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });

    const activeRes = await app.request('/api/v1/accounts?status=active', {
      headers: bearerHeader(token),
    });
    expect(((await activeRes.json()) as AccountResponse[]).length).toBe(0);

    const archivedRes = await app.request('/api/v1/accounts?status=archived', {
      headers: bearerHeader(token),
    });
    expect(((await archivedRes.json()) as AccountResponse[]).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/accounts/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/accounts/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/nonexistent');
    expect(res.status).toBe(401);
  });

  test('returns 403 when user has no access', async () => {
    // Create account owned by another user
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(ownerToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    // Another user with no org access
    const { token: otherToken } = await createAuthenticatedUser({ email: 'other@example.com' });

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      headers: bearerHeader(otherToken),
    });

    expect(res.status).toBe(403);
  });

  test('returns the account', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as AccountResponse;
    expect(body.id).toBe(created.id);
    expect(body.name).toBe('Checking Account');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/accounts/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/accounts/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 403 when user has no access', async () => {
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(ownerToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    const { token: otherToken } = await createAuthenticatedUser({ email: 'other2@example.com' });

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(otherToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked' }),
    });

    expect(res.status).toBe(403);
  });

  test('returns 400 for invalid body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('updates account fields', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', color: '#10B981' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as AccountResponse;
    expect(body.name).toBe('Updated Name');
    expect(body.color).toBe('#10B981');
    expect(body.type).toBe('checking'); // unchanged
  });

  test('only owner can archive', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as AccountResponse;
    expect(body.status).toBe('archived');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/accounts/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/accounts/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  test('returns 403 when user is not the owner', async () => {
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(ownerToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    // Another user not in the org
    const { token: otherToken } = await createAuthenticatedUser({ email: 'other3@example.com' });

    const res = await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'DELETE',
      headers: bearerHeader(otherToken),
    });

    expect(res.status).toBe(403);
  });

  test('deletes the account', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_ACCOUNT),
    });
    const created = (await createRes.json()) as AccountResponse;

    const deleteRes = await app.request(`/api/v1/accounts/${created.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });

    expect(deleteRes.status).toBe(200);

    // Confirm it's gone
    const getRes = await app.request(`/api/v1/accounts/${created.id}`, {
      headers: bearerHeader(token),
    });
    expect(getRes.status).toBe(403); // no longer accessible
  });
});

// ---------------------------------------------------------------------------
// Balance calculation
// ---------------------------------------------------------------------------

describe('balance calculation', () => {
  test('balance equals initialBalance when no transactions', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_ACCOUNT, initial_balance: 50000 }),
    });
    const account = (await res.json()) as AccountResponse;
    expect(account.balance).toBe(50000);
  });

  test('balance reflects transactions', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_ACCOUNT, initial_balance: 100000 }),
    });
    const account = (await createRes.json()) as AccountResponse;

    // Add an expense (-3000) and income (+5000)
    await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.teamId,
        type: 'expense',
        amount: 3000,
        date: '2024-01-01',
      }),
    });
    await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.teamId,
        type: 'income',
        amount: 5000,
        date: '2024-01-02',
      }),
    });

    // balance = 100000 - 3000 + 5000 = 102000
    const listRes = await app.request('/api/v1/accounts', { headers: bearerHeader(token) });
    const accounts = (await listRes.json()) as AccountResponse[];
    const updated = accounts.find((a) => a.id === account.id)!;
    expect(updated.balance).toBe(102000);

    // GET /accounts/:id also reflects it
    const singleRes = await app.request(`/api/v1/accounts/${account.id}`, {
      headers: bearerHeader(token),
    });
    const single = (await singleRes.json()) as AccountResponse;
    expect(single.balance).toBe(102000);
  });
});
