/**
 * E2E Integration Test: Multi-User Sharing & Permissions Flow
 *
 * Tests the complete user journey: account creation, transactions,
 * invitation, acceptance, access control (read vs write), role changes,
 * and access revocation.
 *
 * Some tests target features that don't exist yet (sharing routes,
 * notification routes, per-account roles). These will fail until
 * the features are implemented — they serve as the spec.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '@/index';
import {
  addUserToOrg,
  addUserToTeam,
  bearerHeader,
  createAuthenticatedUserWithOrg,
  removeUserFromOrg,
  removeUserFromTeam,
  setActiveOrg,
  updateOrgRole,
} from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountResponse = {
  id: string;
  teamId: string;
  organizationId: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
};

type TransactionResponse = {
  id: string;
  accountId: string;
  type: string;
  amount: number;
  date: string;
  payee: string | null;
  transferId: string | null;
};

type TransactionListResponse = {
  data: TransactionResponse[];
  nextCursor: string | null;
};

type ErrorResponse = {
  error: { code: string; message: string };
};

type NotificationResponse = {
  id: string;
  type: string;
  status: string;
  data: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function authJson(token: string) {
  return { ...bearerHeader(token), ...JSON_HEADERS };
}

async function createAccount(token: string, name: string, type = 'checking') {
  const response = await app.request('/api/v1/accounts', {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify({
      name,
      type,
      currency: 'USD',
      initialBalance: 0,
    }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as AccountResponse;
}

async function createTransaction(
  token: string,
  teamId: string,
  type: 'income' | 'expense' | 'transfer',
  amount: number,
  options: { payee?: string; toTeamId?: string } = {}
) {
  const response = await app.request('/api/v1/transactions', {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify({
      accountId: teamId,
      type,
      amount,
      date: '2026-04-01',
      payee: options.payee ?? `${type}-payee`,
      ...(options.toTeamId ? { toAccountId: options.toTeamId } : {}),
    }),
  });
  return response;
}

async function listTransactions(token: string, teamId: string) {
  const response = await app.request(`/api/v1/transactions?accountId=${teamId}`, {
    headers: bearerHeader(token),
  });
  return response;
}

// ---------------------------------------------------------------------------
// Shared state across phases (describe blocks share this via closure)
// ---------------------------------------------------------------------------

let user1Token: string;
let user1OrgId: string;
let user2Token: string;
let user2OrgId: string;
let user2Id: string;
let accountA: AccountResponse;
let accountB: AccountResponse;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ==========================================================================
// Phase 1: Setup — create users and accounts
// ==========================================================================

describe('Phase 1: Setup', () => {
  test('create user1 with org', async () => {
    const result = await createAuthenticatedUserWithOrg({
      email: 'user1@test.com',
      name: 'User One',
    });
    user1Token = result.token;
    user1OrgId = result.org.id;
    expect(user1Token).toBeDefined();
  });

  test('create user2 with their own org', async () => {
    const result = await createAuthenticatedUserWithOrg({
      email: 'user2@test.com',
      name: 'User Two',
    });
    user2Token = result.token;
    user2OrgId = result.org.id;
    user2Id = result.user.id;
    expect(user2Token).toBeDefined();
  });

  test('user1 creates Account-A', async () => {
    accountA = await createAccount(user1Token, 'Account A', 'checking');
    expect(accountA.name).toBe('Account A');
  });

  test('user1 creates Account-B', async () => {
    accountB = await createAccount(user1Token, 'Account B', 'savings');
    expect(accountB.name).toBe('Account B');
  });
});

// ==========================================================================
// Phase 2: User1 populates accounts with transactions
// ==========================================================================

describe('Phase 2: Populate accounts', () => {
  test('user1 adds 2 expenses to Account-A', async () => {
    const response1 = await createTransaction(user1Token, accountA.teamId, 'expense', 5000, {
      payee: 'Grocery Store',
    });
    const response2 = await createTransaction(user1Token, accountA.teamId, 'expense', 3000, {
      payee: 'Gas Station',
    });
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);
  });

  test('user1 adds 2 incomes to Account-A', async () => {
    const response1 = await createTransaction(user1Token, accountA.teamId, 'income', 100000, {
      payee: 'Salary',
    });
    const response2 = await createTransaction(user1Token, accountA.teamId, 'income', 20000, {
      payee: 'Freelance',
    });
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);
  });

  test('user1 adds 1 transfer from Account-A to Account-B', async () => {
    const response = await createTransaction(user1Token, accountA.teamId, 'transfer', 10000, {
      payee: 'Savings transfer',
      toTeamId: accountB.teamId,
    });
    expect(response.status).toBe(201);
  });

  test('user1 adds 2 expenses to Account-B', async () => {
    const response1 = await createTransaction(user1Token, accountB.teamId, 'expense', 2000, {
      payee: 'Coffee Shop',
    });
    const response2 = await createTransaction(user1Token, accountB.teamId, 'expense', 1500, {
      payee: 'Book Store',
    });
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);
  });

  test('user1 adds 2 incomes to Account-B', async () => {
    const response1 = await createTransaction(user1Token, accountB.teamId, 'income', 50000, {
      payee: 'Interest',
    });
    const response2 = await createTransaction(user1Token, accountB.teamId, 'income', 15000, {
      payee: 'Refund',
    });
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);
  });

  test('user1 adds 1 transfer from Account-B to Account-A', async () => {
    const response = await createTransaction(user1Token, accountB.teamId, 'transfer', 5000, {
      payee: 'Emergency fund',
      toTeamId: accountA.teamId,
    });
    expect(response.status).toBe(201);
  });

  test('Account-A has correct transaction count', async () => {
    const response = await listTransactions(user1Token, accountA.teamId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as TransactionListResponse;
    // 5 direct + 1 inbound from B-to-A transfer = 6
    expect(body.data.length).toBe(6);
  });

  test('Account-B has correct transaction count', async () => {
    const response = await listTransactions(user1Token, accountB.teamId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as TransactionListResponse;
    // 5 direct + 1 inbound from A-to-B transfer = 6
    expect(body.data.length).toBe(6);
  });
});

// ==========================================================================
// Phase 3: User1 invites User2 to Account-A as viewer
// (WILL FAIL — sharing routes don't exist yet)
// ==========================================================================

describe('Phase 3: Invite user2 to Account-A as viewer', () => {
  test('user1 invites user2 to Account-A with viewer role', async () => {
    const response = await app.request('/api/v1/sharing/invite', {
      method: 'POST',
      headers: authJson(user1Token),
      body: JSON.stringify({
        accountId: accountA.id,
        email: 'user2@test.com',
        role: 'viewer',
      }),
    });
    expect(response.status).toBe(201);
  });
});

// ==========================================================================
// Phase 4: User2 checks notifications and accepts
// (WILL FAIL — notification routes don't exist yet)
// ==========================================================================

describe('Phase 4: User2 checks notifications and accepts invite', () => {
  let invitationNotificationId: string;

  test('user2 sees pending invitation in notifications', async () => {
    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: NotificationResponse[] };
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const invitation = body.data.find((notification) => notification.type === 'account_invitation');
    expect(invitation).toBeDefined();
    expect(invitation!.status).toBe('pending');
    invitationNotificationId = invitation!.id;
  });

  test('user2 accepts the invitation', async () => {
    const response = await app.request(`/api/v1/notifications/${invitationNotificationId}/accept`, {
      method: 'POST',
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
  });
});

// ==========================================================================
// Phase 5: User2 verifies viewer access to Account-A
// ==========================================================================

describe('Phase 5: User2 viewer access to Account-A', () => {
  // Simulate invitation acceptance via direct DB (until sharing routes exist)
  beforeAll(async () => {
    await addUserToTeam(user2Id, accountA.teamId);
  });

  test('user2 can read Account-A', async () => {
    const response = await app.request(`/api/v1/accounts/${accountA.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountResponse;
    expect(body.name).toBe('Account A');
  });

  test('user2 cannot read Account-B', async () => {
    const response = await app.request(`/api/v1/accounts/${accountB.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(403);
  });
});

// ==========================================================================
// Phase 6: User2 tries to write on shared account — should fail
// ==========================================================================

describe('Phase 6: User2 cannot write as viewer', () => {
  test('user2 cannot create transaction on Account-A (viewer)', async () => {
    // User2 needs activeOrganizationId to hit transaction routes.
    // Set user2's session to user1's org to test the permission check.
    await setActiveOrg(user2Token, user1OrgId);

    const response = await createTransaction(user2Token, accountA.teamId, 'expense', 1000, {
      payee: 'Unauthorized purchase',
    });
    // Should be 403 — viewer cannot create transactions
    expect(response.status).toBe(403);
  });

  test('user2 cannot update Account-A (viewer)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountA.id}`, {
      method: 'PATCH',
      headers: authJson(user2Token),
      body: JSON.stringify({ name: 'Hacked Account' }),
    });
    expect(response.status).toBe(403);
  });

  test('user2 cannot delete Account-A (viewer)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountA.id}`, {
      method: 'DELETE',
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(403);
  });
});

// ==========================================================================
// Phase 7: User1 gives User2 editor access to Account-B
// (WILL FAIL — sharing routes + per-account roles don't exist yet)
// ==========================================================================

describe('Phase 7: Invite user2 to Account-B as editor', () => {
  test('user1 invites user2 to Account-B with editor role', async () => {
    const response = await app.request('/api/v1/sharing/invite', {
      method: 'POST',
      headers: authJson(user1Token),
      body: JSON.stringify({
        accountId: accountB.id,
        email: 'user2@test.com',
        role: 'editor',
      }),
    });
    expect(response.status).toBe(201);
  });

  test('user2 accepts invitation via notifications', async () => {
    const response = await app.request('/api/v1/notifications', {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: NotificationResponse[] };
    const invitation = body.data.find(
      (notification) =>
        notification.type === 'account_invitation' && notification.status === 'pending'
    );
    expect(invitation).toBeDefined();

    const acceptResponse = await app.request(`/api/v1/notifications/${invitation!.id}/accept`, {
      method: 'POST',
      headers: bearerHeader(user2Token),
    });
    expect(acceptResponse.status).toBe(200);
  });
});

// ==========================================================================
// Phase 8: User2 verifies correct access levels on both accounts
// (Per-account roles WILL FAIL — currently team member = viewer only)
// ==========================================================================

describe('Phase 8: User2 has viewer on A, editor on B', () => {
  // Simulate: add user2 to Account-B team (until sharing routes exist)
  beforeAll(async () => {
    await addUserToTeam(user2Id, accountB.teamId);
  });

  test('user2 can read Account-A (viewer)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountA.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
  });

  test('user2 can read Account-B (editor)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountB.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
  });

  test('user2 cannot create transaction on Account-A (viewer)', async () => {
    const response = await createTransaction(user2Token, accountA.teamId, 'expense', 500, {
      payee: 'Should fail',
    });
    expect(response.status).toBe(403);
  });

  test('user2 CAN create transaction on Account-B (editor)', async () => {
    const response = await createTransaction(user2Token, accountB.teamId, 'expense', 2500, {
      payee: 'User2 expense',
    });
    // WILL FAIL until per-account roles are implemented (currently team member = viewer)
    expect(response.status).toBe(201);
  });

  test('user2 cannot delete Account-B (editor, not owner)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountB.id}`, {
      method: 'DELETE',
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(403);
  });
});

// ==========================================================================
// Phase 9: User2 adds a transaction on Account-B
// ==========================================================================

describe('Phase 9: User2 adds transaction on Account-B', () => {
  test('user2 creates an expense on Account-B', async () => {
    const response = await createTransaction(user2Token, accountB.teamId, 'expense', 7500, {
      payee: 'User2 restaurant',
    });
    // WILL FAIL until per-account editor roles work
    expect(response.status).toBe(201);
  });
});

// ==========================================================================
// Phase 10: User1 verifies all entries are correct
// ==========================================================================

describe('Phase 10: User1 verifies entries', () => {
  test('Account-A still has original 6 transactions', async () => {
    const response = await listTransactions(user1Token, accountA.teamId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as TransactionListResponse;
    expect(body.data.length).toBe(6);
  });

  test('Account-B has original 6 + user2 entries', async () => {
    const response = await listTransactions(user1Token, accountB.teamId);
    expect(response.status).toBe(200);
    const body = (await response.json()) as TransactionListResponse;
    // 6 original + 2 from user2 (phases 8 + 9) = 8
    // WILL FAIL until per-account editor roles work (user2 can't create yet)
    expect(body.data.length).toBe(8);
  });

  test('user2 transactions appear with correct data', async () => {
    const response = await listTransactions(user1Token, accountB.teamId);
    const body = (await response.json()) as TransactionListResponse;
    const user2Transactions = body.data.filter(
      (transaction) =>
        transaction.payee === 'User2 restaurant' || transaction.payee === 'User2 expense'
    );
    // WILL FAIL until per-account editor roles work
    expect(user2Transactions.length).toBe(2);
  });
});

// ==========================================================================
// Phase 11: User1 removes User2's access to Account-B
// (WILL FAIL — sharing/revoke routes don't exist yet)
// ==========================================================================

describe('Phase 11: Revoke user2 access to Account-B', () => {
  test('user1 revokes user2 access to Account-B via sharing route', async () => {
    const response = await app.request(`/api/v1/sharing/${accountB.id}`, {
      method: 'DELETE',
      headers: authJson(user1Token),
      body: JSON.stringify({ userId: user2Id }),
    });
    expect(response.status).toBe(200);
  });

  // Fallback: simulate revocation via direct DB (until sharing routes exist)
  test('[simulated] remove user2 from Account-B team', async () => {
    await removeUserFromTeam(user2Id, accountB.teamId);
    // Verify via direct account access
    const response = await app.request(`/api/v1/accounts/${accountB.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(403);
  });
});

// ==========================================================================
// Phase 12: User2 verifies remaining access
// ==========================================================================

describe('Phase 12: User2 remaining access after revocation', () => {
  test('user2 can still read Account-A (viewer access intact)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountA.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
  });

  test('user2 cannot access Account-B (access revoked)', async () => {
    const response = await app.request(`/api/v1/accounts/${accountB.id}`, {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(403);
  });
});

// ==========================================================================
// Phase 13: Org isolation
// ==========================================================================

describe('Phase 13: Organization isolation', () => {
  test('user2 creates an account in their own org', async () => {
    // Reset user2's active org back to their own
    await setActiveOrg(user2Token, user2OrgId);

    const response = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: authJson(user2Token),
      body: JSON.stringify({
        name: 'User2 Private Account',
        type: 'checking',
        currency: 'USD',
        initialBalance: 50000,
      }),
    });
    expect(response.status).toBe(201);
  });

  test('user1 cannot see user2 accounts', async () => {
    const response = await app.request('/api/v1/accounts', {
      headers: bearerHeader(user1Token),
    });
    expect(response.status).toBe(200);
    const accounts = (await response.json()) as AccountResponse[];
    const user2Account = accounts.find((account) => account.name === 'User2 Private Account');
    expect(user2Account).toBeUndefined();
  });

  test('user2 cannot see user1 accounts via list', async () => {
    const response = await app.request('/api/v1/accounts', {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
    const accounts = (await response.json()) as AccountResponse[];
    const user1Account = accounts.find(
      (account) => account.name === 'Account A' || account.name === 'Account B'
    );
    expect(user1Account).toBeUndefined();
  });
});

// ==========================================================================
// Phase 14: Category and tag isolation
// ==========================================================================

describe('Phase 14: Category and tag isolation', () => {
  test('user1 creates a tag', async () => {
    const response = await app.request('/api/v1/tags', {
      method: 'POST',
      headers: authJson(user1Token),
      body: JSON.stringify({ name: 'user1-private-tag' }),
    });
    expect(response.status).toBe(201);
  });

  test('user2 cannot see user1 tags', async () => {
    const response = await app.request('/api/v1/tags', {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
    const tags = (await response.json()) as { name: string }[];
    const user1Tag = tags.find((tag) => tag.name === 'user1-private-tag');
    expect(user1Tag).toBeUndefined();
  });

  test('user2 cannot see user1 custom categories', async () => {
    // Create a custom category for user1
    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: authJson(user1Token),
      body: JSON.stringify({ name: 'User1 Custom', icon: 'star', color: '#FF0000' }),
    });

    // user2 should not see it
    const response = await app.request('/api/v1/categories', {
      headers: bearerHeader(user2Token),
    });
    expect(response.status).toBe(200);
    const categories = (await response.json()) as { name: string }[];
    const flatNames = categories.map((category) => category.name);
    expect(flatNames).not.toContain('User1 Custom');
  });
});

// ==========================================================================
// Phase 15: Transfer integrity
// ==========================================================================

describe('Phase 15: Transfer integrity', () => {
  test('transfers created linked pairs with matching transferId', async () => {
    const responseA = await listTransactions(user1Token, accountA.teamId);
    const bodyA = (await responseA.json()) as TransactionListResponse;

    const transfers = bodyA.data.filter((transaction) => transaction.transferId !== null);
    expect(transfers.length).toBeGreaterThanOrEqual(1);

    // Each transfer should have a matching counterpart
    for (const transfer of transfers) {
      const responseCounterpart = await listTransactions(user1Token, accountB.teamId);
      const bodyCounterpart = (await responseCounterpart.json()) as TransactionListResponse;
      const counterpart = bodyCounterpart.data.find(
        (transaction) =>
          transaction.transferId === transfer.transferId && transaction.id !== transfer.id
      );
      expect(counterpart).toBeDefined();
    }
  });

  test('transfer amounts are correctly signed (negative outflow, positive inflow)', async () => {
    const responseA = await listTransactions(user1Token, accountA.teamId);
    const bodyA = (await responseA.json()) as TransactionListResponse;

    // Find the outgoing transfer from A (A->B, 10000 cents)
    const outgoing = bodyA.data.find(
      (transaction) => transaction.type === 'transfer' && transaction.amount < 0
    );
    expect(outgoing).toBeDefined();
    expect(outgoing!.amount).toBe(-10000);

    // Find the incoming transfer to A (B->A, 5000 cents)
    const incoming = bodyA.data.find(
      (transaction) => transaction.type === 'transfer' && transaction.amount > 0
    );
    expect(incoming).toBeDefined();
    expect(incoming!.amount).toBe(5000);
  });
});

// ==========================================================================
// Phase 16: Edge cases
// ==========================================================================

describe('Phase 16: Edge cases', () => {
  test('unauthenticated user gets 401', async () => {
    const response = await app.request('/api/v1/accounts');
    expect(response.status).toBe(401);
  });

  test('user with no active org gets 400 on org-scoped routes', async () => {
    // Create a user with no org set on session
    const { createAuthenticatedUser } = await import('@/tests/helpers/auth');
    const { token: noOrgToken } = await createAuthenticatedUser({ email: 'no-org@test.com' });

    const response = await app.request('/api/v1/accounts', {
      headers: bearerHeader(noOrgToken),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('transaction referencing account from another org returns error', async () => {
    // user2 (own org active) tries to create transaction on user1's account
    await setActiveOrg(user2Token, user2OrgId);

    const response = await createTransaction(user2Token, accountA.teamId, 'expense', 1000, {
      payee: 'Cross-org attack',
    });
    // Should be 404 (account not found in user2's org) or 403
    expect([403, 404]).toContain(response.status);
  });

  test('user invites themselves returns 400', async () => {
    const response = await app.request('/api/v1/sharing/invite', {
      method: 'POST',
      headers: authJson(user1Token),
      body: JSON.stringify({
        accountId: accountA.id,
        email: 'user1@test.com',
        role: 'viewer',
      }),
    });
    // WILL FAIL — sharing routes don't exist yet
    expect(response.status).toBe(400);
  });

  test('inviting user who already has access returns 409', async () => {
    // user2 still has team access to Account-A
    const response = await app.request('/api/v1/sharing/invite', {
      method: 'POST',
      headers: authJson(user1Token),
      body: JSON.stringify({
        accountId: accountA.id,
        email: 'user2@test.com',
        role: 'viewer',
      }),
    });
    // WILL FAIL — sharing routes don't exist yet
    expect(response.status).toBe(409);
  });
});
