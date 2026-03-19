import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import type { TransactionListResponse, TransactionResponse } from '@moneylens/shared';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; teamId: string }> {
  const res = await app.request('/api/v1/accounts', {
    method: 'POST',
    headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Account',
      type: 'checking',
      currency: 'USD',
      initial_balance: 0,
      ...overrides,
    }),
  });
  if (res.status !== 201) throw new Error(`createAccount failed: ${res.status}`);
  const data = (await res.json()) as { id: string; teamId: string };
  return data;
}

async function createTransaction(
  token: string,
  body: Record<string, unknown>
): Promise<TransactionResponse> {
  const res = await app.request('/api/v1/transactions', {
    method: 'POST',
    headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status !== 201)
    throw new Error(`createTransaction failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TransactionResponse>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// POST /api/v1/transactions
// ---------------------------------------------------------------------------

describe('POST /api/v1/transactions', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'x', type: 'expense', amount: 100, date: '2024-01-01' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();
    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'x', type: 'expense', amount: 100, date: '2024-01-01' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns 400 for invalid request body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'x', type: 'invalid_type', amount: -50 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 404 when account not found', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: crypto.randomUUID(),
        type: 'expense',
        amount: 1000,
        date: '2024-01-01',
      }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('creates an expense transaction', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const tx = await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 1250,
      date: '2024-01-15',
      payee: 'Starbucks',
    });

    expect(tx.type).toBe('expense');
    expect(tx.amount).toBe(-1250); // signed: expense is negative
    expect(tx.date).toBe('2024-01-15');
    expect(tx.payee).toBe('Starbucks');
    expect(tx.transferId).toBeNull();
    expect(tx.tags).toEqual([]);
  });

  test('creates an income transaction', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const tx = await createTransaction(token, {
      accountId: account.teamId,
      type: 'income',
      amount: 500000,
      date: '2024-01-01',
      payee: 'Employer',
    });

    expect(tx.amount).toBe(500000); // income is positive
  });

  test('creates a transfer as a linked pair', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const from = await createAccount(token, { name: 'Checking' });
    const to = await createAccount(token, { name: 'Savings' });

    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: from.teamId,
        toAccountId: to.teamId,
        type: 'transfer',
        amount: 20000,
        date: '2024-01-10',
      }),
    });

    expect(res.status).toBe(201);
    const outflow = (await res.json()) as TransactionResponse;

    // Outflow: negative on source account
    expect(outflow.accountId).toBe(from.teamId);
    expect(outflow.amount).toBe(-20000);
    expect(outflow.transferId).toBeTruthy();

    // Fetch the paired inflow from the destination account
    const listRes = await app.request(`/api/v1/transactions?accountId=${to.teamId}`, {
      headers: bearerHeader(token),
    });
    const list = (await listRes.json()) as TransactionListResponse;
    expect(list.data.length).toBe(1);
    expect(list.data[0]?.amount).toBe(20000); // inflow: positive
    expect(list.data[0]?.transferId).toBe(outflow.transferId);
  });

  test('returns 400 when transfer missing toAccountId', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.teamId,
        type: 'transfer',
        amount: 1000,
        date: '2024-01-01',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('INVALID_TRANSFER');
  });

  test('creates transaction with tags', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    // Create a tag first
    const tagRes = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'business' }),
    });
    expect(tagRes.status).toBe(201);
    const tag = (await tagRes.json()) as { id: string };

    const tx = await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 500,
      date: '2024-01-01',
      tagIds: [tag.id],
    });

    expect(tx.tags.length).toBe(1);
    expect(tx.tags[0]?.name).toBe('business');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/transactions
// ---------------------------------------------------------------------------

describe('GET /api/v1/transactions', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/transactions');
    expect(res.status).toBe(401);
  });

  test('returns paginated list of transactions', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-03',
    });
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'income',
      amount: 200,
      date: '2024-01-02',
    });
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 300,
      date: '2024-01-01',
    });

    const res = await app.request('/api/v1/transactions', { headers: bearerHeader(token) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TransactionListResponse;
    expect(body.data.length).toBe(3);
    expect(body.nextCursor).toBeNull();
    // Ordered by date DESC
    expect(body.data[0]?.date).toBe('2024-01-03');
  });

  test('filters by accountId', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const a = await createAccount(token, { name: 'A' });
    const b = await createAccount(token, { name: 'B' });

    await createTransaction(token, {
      accountId: a.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
    });
    await createTransaction(token, {
      accountId: b.teamId,
      type: 'expense',
      amount: 200,
      date: '2024-01-01',
    });

    const res = await app.request(`/api/v1/transactions?accountId=${a.teamId}`, {
      headers: bearerHeader(token),
    });
    const body = (await res.json()) as TransactionListResponse;
    expect(body.data.length).toBe(1);
    expect(body.data[0]?.accountId).toBe(a.teamId);
  });

  test('returns empty list for different org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
    });

    const other = await createTestUser({ email: 'other@example.com' });
    const org2 = await createTestOrg(other.id);
    const token2 = await createTestSession(other.id, { activeOrganizationId: org2.id });

    const res = await app.request('/api/v1/transactions', { headers: bearerHeader(token2) });
    const body = (await res.json()) as TransactionListResponse;
    expect(body.data.length).toBe(0);
  });

  test('paginates with cursor', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    for (let i = 1; i <= 5; i++) {
      await createTransaction(token, {
        accountId: account.teamId,
        type: 'expense',
        amount: i * 100,
        date: `2024-01-0${i}`,
      });
    }

    const res1 = await app.request('/api/v1/transactions?limit=3', {
      headers: bearerHeader(token),
    });
    const page1 = (await res1.json()) as TransactionListResponse;
    expect(page1.data.length).toBe(3);
    expect(page1.nextCursor).toBeTruthy();

    const res2 = await app.request(`/api/v1/transactions?limit=3&cursor=${page1.nextCursor}`, {
      headers: bearerHeader(token),
    });
    const page2 = (await res2.json()) as TransactionListResponse;
    expect(page2.data.length).toBe(2);
    expect(page2.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/transactions/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/transactions/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/transactions/some-id');
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent transaction', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/transactions/${crypto.randomUUID()}`, {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('returns transaction by id', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const tx = await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 999,
      date: '2024-06-01',
      notes: 'lunch',
    });

    const res = await app.request(`/api/v1/transactions/${tx.id}`, {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TransactionResponse;
    expect(body.id).toBe(tx.id);
    expect(body.notes).toBe('lunch');
  });

  test('returns 404 for transaction in different org', async () => {
    const { token: token1 } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token1);
    const tx = await createTransaction(token1, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
    });

    const other = await createTestUser({ email: 'other@example.com' });
    const org2 = await createTestOrg(other.id);
    const token2 = await createTestSession(other.id, { activeOrganizationId: org2.id });

    const res = await app.request(`/api/v1/transactions/${tx.id}`, {
      headers: bearerHeader(token2),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/transactions/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/transactions/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/transactions/some-id', { method: 'PATCH' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent transaction', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/transactions/${crypto.randomUUID()}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'update' }),
    });
    expect(res.status).toBe(404);
  });

  test('updates transaction fields', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const tx = await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 1000,
      date: '2024-01-01',
    });

    const res = await app.request(`/api/v1/transactions/${tx.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1500, notes: 'updated note', date: '2024-02-01' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TransactionResponse;
    expect(body.amount).toBe(-1500); // stays negative (expense)
    expect(body.notes).toBe('updated note');
    expect(body.date).toBe('2024-02-01');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/transactions/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/transactions/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/transactions/some-id', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent transaction', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/transactions/${crypto.randomUUID()}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('deletes a transaction', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const tx = await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
    });

    const delRes = await app.request(`/api/v1/transactions/${tx.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(delRes.status).toBe(200);

    const getRes = await app.request(`/api/v1/transactions/${tx.id}`, {
      headers: bearerHeader(token),
    });
    expect(getRes.status).toBe(404);
  });

  test('deletes both sides of a transfer', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const from = await createAccount(token, { name: 'From' });
    const to = await createAccount(token, { name: 'To' });

    const res = await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: from.teamId,
        toAccountId: to.teamId,
        type: 'transfer',
        amount: 5000,
        date: '2024-01-01',
      }),
    });
    const outflow = (await res.json()) as TransactionResponse;

    await app.request(`/api/v1/transactions/${outflow.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });

    // Both sides should be gone
    const listRes = await app.request('/api/v1/transactions', { headers: bearerHeader(token) });
    const list = (await listRes.json()) as TransactionListResponse;
    expect(list.data.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/transactions/payees
// ---------------------------------------------------------------------------

describe('GET /api/v1/transactions/payees', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/transactions/payees');
    expect(res.status).toBe(401);
  });

  test('returns distinct payees for the org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
      payee: 'Starbucks',
    });
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 200,
      date: '2024-01-02',
      payee: 'Netflix',
    });
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 300,
      date: '2024-01-03',
      payee: 'Starbucks',
    }); // duplicate

    const res = await app.request('/api/v1/transactions/payees', { headers: bearerHeader(token) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string[] };
    expect(body.data).toHaveLength(2);
    expect(body.data).toContain('Starbucks');
    expect(body.data).toContain('Netflix');
  });

  test('filters payees by query param ?q=', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
      payee: 'Starbucks',
    });
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 200,
      date: '2024-01-02',
      payee: 'Netflix',
    });
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 300,
      date: '2024-01-03',
      payee: 'Star Wars Store',
    });

    const res = await app.request('/api/v1/transactions/payees?q=star', {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string[] };
    expect(body.data).toHaveLength(2);
    expect(body.data).toContain('Starbucks');
    expect(body.data).toContain('Star Wars Store');
    expect(body.data).not.toContain('Netflix');
  });

  test('excludes null payees', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
    }); // no payee
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 200,
      date: '2024-01-02',
      payee: 'Netflix',
    });

    const res = await app.request('/api/v1/transactions/payees', { headers: bearerHeader(token) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string[] };
    expect(body.data).toEqual(['Netflix']);
  });

  test('does not return payees from another org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    await createTransaction(token, {
      accountId: account.teamId,
      type: 'expense',
      amount: 100,
      date: '2024-01-01',
      payee: 'MyPayee',
    });

    const other = await createTestUser({ email: 'other2@example.com' });
    const org2 = await createTestOrg(other.id);
    const token2 = await createTestSession(other.id, { activeOrganizationId: org2.id });

    const res = await app.request('/api/v1/transactions/payees', { headers: bearerHeader(token2) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string[] };
    expect(body.data).toHaveLength(0);
  });
});
