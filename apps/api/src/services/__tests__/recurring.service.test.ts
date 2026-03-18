import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '@/index';
import { db } from '@/lib/db';
import { recurringRule } from '@/lib/db/schema/recurring';
import { tag } from '@/lib/db/schema/tag';
import { transaction, transactionTag } from '@/lib/db/schema/transaction';
import { generateDueTransactions } from '@/services/recurring.service';
import { createAuthenticatedUserWithOrg } from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

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

async function createTag(token: string, name: string): Promise<{ id: string }> {
  const res = await app.request('/api/v1/tags', {
    method: 'POST',
    headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (res.status !== 201) throw new Error(`createTag failed: ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

/** Insert a recurring rule directly into DB for testing generation logic */
async function insertRule(
  orgId: string,
  accountId: string,
  overrides: Partial<typeof recurringRule.$inferInsert> = {}
) {
  const [rule] = await db
    .insert(recurringRule)
    .values({
      organizationId: orgId,
      accountId,
      name: 'Test Rule',
      type: 'expense',
      amount: 100_00, // $100 in cents
      frequency: 'monthly',
      startDate: '2024-01-01',
      nextDueDate: '2024-01-01',
      isActive: true,
      ...overrides,
    })
    .returning();
  if (!rule) throw new Error('Failed to insert rule');
  return rule;
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
// generateDueTransactions
// ---------------------------------------------------------------------------

describe('generateDueTransactions', () => {
  test('generates a transaction when nextDueDate <= asOfDate', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'monthly',
    });

    const count = await generateDueTransactions('2024-01-01');
    expect(count).toBe(1);

    // Verify transaction was created
    const txs = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(txs.length).toBe(1);
    expect(txs[0]?.date).toBe('2024-01-01');
  });

  test('updates nextDueDate to next occurrence after generation', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'monthly',
    });

    await generateDueTransactions('2024-01-01');

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.nextDueDate).toBe('2024-02-01');
  });

  test('skips paused (isActive=false) rules', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      isActive: false,
    });

    const count = await generateDueTransactions('2024-01-01');
    expect(count).toBe(0);

    const txs = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(txs.length).toBe(0);
  });

  test('skips rules where nextDueDate > asOfDate', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-02-01',
    });

    const count = await generateDueTransactions('2024-01-15');
    expect(count).toBe(0);
  });

  test('deactivates rule when next occurrence would exceed endDate', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-03-01',
      startDate: '2024-01-01',
      endDate: '2024-03-15', // next after 2024-03-01 would be 2024-04-01 > endDate
      frequency: 'monthly',
    });

    const count = await generateDueTransactions('2024-03-01');
    expect(count).toBe(1);

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.isActive).toBe(false);
  });

  test('generates multiple transactions if rule has fallen behind', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'monthly',
    });

    // 3 months behind
    const count = await generateDueTransactions('2024-03-15');
    expect(count).toBe(3); // Jan, Feb, Mar

    const txs = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(txs.length).toBe(3);
  });

  test('signs amount correctly: expense is negative', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      type: 'expense',
      amount: 150_00,
    });

    await generateDueTransactions('2024-01-01');

    const [tx] = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(tx?.amount).toBe(-150_00);
    expect(tx?.type).toBe('expense');
  });

  test('signs amount correctly: income is positive', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      type: 'income',
      amount: 500_000,
    });

    await generateDueTransactions('2024-01-01');

    const [tx] = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(tx?.amount).toBe(500_000);
    expect(tx?.type).toBe('income');
  });

  test('generated transaction inherits fields from rule', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-15',
      type: 'expense',
      amount: 250_00,
      payee: 'Netflix',
      notes: 'Monthly subscription',
    });

    await generateDueTransactions('2024-01-15');

    const [tx] = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(tx?.accountId).toBe(account.teamId);
    expect(tx?.payee).toBe('Netflix');
    expect(tx?.notes).toBe('Monthly subscription');
    expect(tx?.date).toBe('2024-01-15');
  });

  test('handles different frequencies correctly', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    // Weekly rule
    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'weekly',
    });

    await generateDueTransactions('2024-01-01');

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.nextDueDate).toBe('2024-01-08');
  });

  test('handles daily frequency', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'daily',
    });

    await generateDueTransactions('2024-01-01');

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.nextDueDate).toBe('2024-01-02');
  });

  test('handles biweekly frequency', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'biweekly',
    });

    await generateDueTransactions('2024-01-01');

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.nextDueDate).toBe('2024-01-15');
  });

  test('handles quarterly frequency', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'quarterly',
    });

    await generateDueTransactions('2024-01-01');

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.nextDueDate).toBe('2024-04-01');
  });

  test('handles yearly frequency', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const rule = await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      startDate: '2024-01-01',
      frequency: 'yearly',
    });

    await generateDueTransactions('2024-01-01');

    const [updated] = await db.select().from(recurringRule).where(eq(recurringRule.id, rule.id));
    expect(updated?.nextDueDate).toBe('2025-01-01');
  });

  test('generated transaction inherits categoryId from rule', async () => {
    const { token, org } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    // Get a category from the seeded defaults
    const catRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const categories = (await catRes.json()) as { id: string }[];
    const categoryId = categories[0]?.id;

    await insertRule(org.id, account.teamId, {
      nextDueDate: '2024-01-01',
      categoryId,
    });

    await generateDueTransactions('2024-01-01');

    const [tx] = await db.select().from(transaction).where(eq(transaction.organizationId, org.id));
    expect(tx?.categoryId).toBe(categoryId);
  });
});
