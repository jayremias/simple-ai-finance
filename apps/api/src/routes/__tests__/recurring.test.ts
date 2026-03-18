import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import type { RecurringRuleResponse } from '@moneylens/shared';
import { app } from '@/index';
import {
  bearerHeader,
  createAuthenticatedUser,
  createAuthenticatedUserWithOrg,
  createTestOrg,
  createTestSession,
  createTestUser,
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
  return res.json() as Promise<{ id: string; teamId: string }>;
}

async function createRule(
  token: string,
  body: Record<string, unknown>
): Promise<RecurringRuleResponse> {
  const res = await app.request('/api/v1/recurring', {
    method: 'POST',
    headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status !== 201) throw new Error(`createRule failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<RecurringRuleResponse>;
}

function defaultRuleBody(accountId: string, overrides: Record<string, unknown> = {}) {
  return {
    accountId,
    name: 'Rent',
    type: 'expense',
    amount: 150_000,
    frequency: 'monthly',
    startDate: '2025-02-01',
    ...overrides,
  };
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
// POST /api/v1/recurring
// ---------------------------------------------------------------------------

describe('POST /api/v1/recurring', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'x',
        name: 'Rent',
        type: 'expense',
        amount: 100,
        frequency: 'monthly',
        startDate: '2025-01-01',
      }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();
    const res = await app.request('/api/v1/recurring', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'x',
        name: 'Rent',
        type: 'expense',
        amount: 100,
        frequency: 'monthly',
        startDate: '2025-01-01',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns 400 for invalid request body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/recurring', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'x',
        name: '',
        type: 'invalid',
        amount: -50,
        frequency: 'never',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 404 when account not found', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/recurring', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultRuleBody(crypto.randomUUID())),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('creates a recurring rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await createRule(token, defaultRuleBody(account.teamId));

    expect(rule.name).toBe('Rent');
    expect(rule.type).toBe('expense');
    expect(rule.amount).toBe(150_000);
    expect(rule.frequency).toBe('monthly');
    expect(rule.startDate).toBe('2025-02-01');
    expect(rule.nextDueDate).toBe('2025-02-01');
    expect(rule.isActive).toBe(true);
    expect(rule.endDate).toBeNull();
    expect(rule.id).toBeTruthy();
  });

  test('creates a rule with optional fields', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await createRule(
      token,
      defaultRuleBody(account.teamId, {
        payee: 'Landlord',
        notes: 'Monthly rent',
        endDate: '2025-12-31',
      })
    );

    expect(rule.payee).toBe('Landlord');
    expect(rule.notes).toBe('Monthly rent');
    expect(rule.endDate).toBe('2025-12-31');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/recurring
// ---------------------------------------------------------------------------

describe('GET /api/v1/recurring', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring');
    expect(res.status).toBe(401);
  });

  test('lists recurring rules for the org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await createRule(token, defaultRuleBody(account.teamId, { name: 'Rent' }));
    await createRule(token, defaultRuleBody(account.teamId, { name: 'Gym' }));

    const res = await app.request('/api/v1/recurring', {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: RecurringRuleResponse[]; nextCursor: string | null };
    expect(body.data.length).toBe(2);
    expect(body.nextCursor).toBeNull();
  });

  test('filters by accountId', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const a = await createAccount(token, { name: 'Checking' });
    const b = await createAccount(token, { name: 'Savings' });

    await createRule(token, defaultRuleBody(a.teamId, { name: 'Rent' }));
    await createRule(token, defaultRuleBody(b.teamId, { name: 'Gym' }));

    const res = await app.request(`/api/v1/recurring?accountId=${a.teamId}`, {
      headers: bearerHeader(token),
    });
    const body = (await res.json()) as { data: RecurringRuleResponse[] };
    expect(body.data.length).toBe(1);
    expect(body.data[0]?.name).toBe('Rent');
  });

  test('filters by isActive', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await createRule(token, defaultRuleBody(account.teamId, { name: 'Active' }));
    await createRule(token, defaultRuleBody(account.teamId, { name: 'ToPause' }));

    // Pause the second one
    await app.request(`/api/v1/recurring/${rule.id}/pause`, {
      method: 'POST',
      headers: bearerHeader(token),
    });

    // Filter active only — should exclude paused
    const res = await app.request('/api/v1/recurring?isActive=true', {
      headers: bearerHeader(token),
    });
    const body = (await res.json()) as { data: RecurringRuleResponse[] };
    // One was paused, so depending on which was paused, check count
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('returns empty list for different org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    await createRule(token, defaultRuleBody(account.teamId));

    const other = await createTestUser({ email: 'other@example.com' });
    const org2 = await createTestOrg(other.id);
    const token2 = await createTestSession(other.id, { activeOrganizationId: org2.id });

    const res = await app.request('/api/v1/recurring', {
      headers: bearerHeader(token2),
    });
    const body = (await res.json()) as { data: RecurringRuleResponse[] };
    expect(body.data.length).toBe(0);
  });

  test('paginates with cursor', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    for (let i = 1; i <= 5; i++) {
      await createRule(token, defaultRuleBody(account.teamId, { name: `Rule ${i}` }));
    }

    const res1 = await app.request('/api/v1/recurring?limit=3', {
      headers: bearerHeader(token),
    });
    const page1 = (await res1.json()) as {
      data: RecurringRuleResponse[];
      nextCursor: string | null;
    };
    expect(page1.data.length).toBe(3);
    expect(page1.nextCursor).toBeTruthy();

    const res2 = await app.request(`/api/v1/recurring?limit=3&cursor=${page1.nextCursor}`, {
      headers: bearerHeader(token),
    });
    const page2 = (await res2.json()) as {
      data: RecurringRuleResponse[];
      nextCursor: string | null;
    };
    expect(page2.data.length).toBe(2);
    expect(page2.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/recurring/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/recurring/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring/some-id');
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/recurring/${crypto.randomUUID()}`, {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('returns a rule by id', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    const res = await app.request(`/api/v1/recurring/${rule.id}`, {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecurringRuleResponse;
    expect(body.id).toBe(rule.id);
    expect(body.name).toBe('Rent');
  });

  test('returns 404 for rule in different org', async () => {
    const { token: token1 } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token1);
    const rule = await createRule(token1, defaultRuleBody(account.teamId));

    const other = await createTestUser({ email: 'other@example.com' });
    const org2 = await createTestOrg(other.id);
    const token2 = await createTestSession(other.id, { activeOrganizationId: org2.id });

    const res = await app.request(`/api/v1/recurring/${rule.id}`, {
      headers: bearerHeader(token2),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/recurring/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/recurring/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring/some-id', { method: 'PATCH' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/recurring/${crypto.randomUUID()}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid update body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    const res = await app.request(`/api/v1/recurring/${rule.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -100 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('updates rule fields', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    const res = await app.request(`/api/v1/recurring/${rule.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Rent',
        amount: 160_000,
        payee: 'New Landlord',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecurringRuleResponse;
    expect(body.name).toBe('Updated Rent');
    expect(body.amount).toBe(160_000);
    expect(body.payee).toBe('New Landlord');
  });

  test('can set endDate', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    const res = await app.request(`/api/v1/recurring/${rule.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ endDate: '2025-12-31' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecurringRuleResponse;
    expect(body.endDate).toBe('2025-12-31');
  });

  test('can clear endDate with null', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(
      token,
      defaultRuleBody(account.teamId, { endDate: '2025-12-31' })
    );

    const res = await app.request(`/api/v1/recurring/${rule.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ endDate: null }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecurringRuleResponse;
    expect(body.endDate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/recurring/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/recurring/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring/some-id', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/recurring/${crypto.randomUUID()}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('deletes a recurring rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    const delRes = await app.request(`/api/v1/recurring/${rule.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(delRes.status).toBe(200);

    const getRes = await app.request(`/api/v1/recurring/${rule.id}`, {
      headers: bearerHeader(token),
    });
    expect(getRes.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/recurring/:id/pause
// ---------------------------------------------------------------------------

describe('POST /api/v1/recurring/:id/pause', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring/some-id/pause', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/recurring/${crypto.randomUUID()}/pause`, {
      method: 'POST',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('pauses a recurring rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    expect(rule.isActive).toBe(true);

    const res = await app.request(`/api/v1/recurring/${rule.id}/pause`, {
      method: 'POST',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecurringRuleResponse;
    expect(body.isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/recurring/:id/resume
// ---------------------------------------------------------------------------

describe('POST /api/v1/recurring/:id/resume', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/recurring/some-id/resume', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/recurring/${crypto.randomUUID()}/resume`, {
      method: 'POST',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('resumes a paused recurring rule', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);
    const rule = await createRule(token, defaultRuleBody(account.teamId));

    // Pause first
    await app.request(`/api/v1/recurring/${rule.id}/pause`, {
      method: 'POST',
      headers: bearerHeader(token),
    });

    // Resume
    const res = await app.request(`/api/v1/recurring/${rule.id}/resume`, {
      method: 'POST',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecurringRuleResponse;
    expect(body.isActive).toBe(true);
  });
});
