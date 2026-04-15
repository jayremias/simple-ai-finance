import type { CreateAccountInput, UpdateAccountInput } from '@moneylens/shared/types';
import { and, eq, inArray, sql, sum } from 'drizzle-orm';
import { db } from '@/lib/db';
import { financialAccount } from '@/lib/db/schema/financial-account';
import { member } from '@/lib/db/schema/organization';
import { team, teamMember } from '@/lib/db/schema/team';
import { transaction } from '@/lib/db/schema/transaction';

export async function createAccount(
  userId: string,
  organizationId: string,
  data: CreateAccountInput
) {
  const teamId = crypto.randomUUID();

  const [account] = await db.transaction(async (tx) => {
    // Create the Better Auth team row directly — avoids going through BA's HTTP layer
    await tx.insert(team).values({
      id: teamId,
      name: data.name,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tx.insert(teamMember).values({
      id: crypto.randomUUID(),
      teamId,
      userId,
      createdAt: new Date(),
    });

    return tx
      .insert(financialAccount)
      .values({
        teamId,
        organizationId,
        name: data.name,
        type: data.type,
        currency: data.currency,
        initialBalance: data.initial_balance,
        color: data.color ?? null,
        icon: data.icon ?? null,
        openedAt: data.opened_at ?? null,
      })
      .returning();
  });

  if (!account) throw new Error('Failed to create financial account');
  // New account has no transactions yet — balance equals initialBalance
  return withBalance(account, new Map());
}

/**
 * Fetches transaction sums grouped by accountId (= team.id) for a set of teamIds.
 * Returns a Map<teamId, sumCents>.
 */
async function fetchTxSums(teamIds: string[]): Promise<Map<string, number>> {
  if (teamIds.length === 0) return new Map();

  const rows = await db
    .select({
      accountId: transaction.accountId,
      txSum: sql<string>`coalesce(${sum(transaction.amount)}, 0)`,
    })
    .from(transaction)
    .where(inArray(transaction.accountId, teamIds))
    .groupBy(transaction.accountId);

  return new Map(rows.map((r) => [r.accountId, Number(r.txSum)]));
}

function withBalance<T extends { teamId: string; initialBalance: number }>(
  account: T,
  txSums: Map<string, number>
) {
  return { ...account, balance: account.initialBalance + (txSums.get(account.teamId) ?? 0) };
}

export async function listAccountsByOrg(organizationId: string, status?: string) {
  const conditions = [eq(financialAccount.organizationId, organizationId)];
  if (status) conditions.push(eq(financialAccount.status, status));

  const accounts = await db
    .select()
    .from(financialAccount)
    .where(and(...conditions))
    .orderBy(financialAccount.sortOrder);

  const txSums = await fetchTxSums(accounts.map((a) => a.teamId));
  return accounts.map((a) => withBalance(a, txSums));
}

export async function getAccountById(accountId: string) {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.id, accountId))
    .limit(1);

  if (!account) return null;

  const txSums = await fetchTxSums([account.teamId]);
  return withBalance(account, txSums);
}

export async function getAccountByTeamId(teamId: string) {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.teamId, teamId))
    .limit(1);

  if (!account) return null;

  const txSums = await fetchTxSums([account.teamId]);
  return withBalance(account, txSums);
}

export async function updateAccount(accountId: string, data: UpdateAccountInput) {
  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.currency !== undefined) updates.currency = data.currency;
  if (data.color !== undefined) updates.color = data.color;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.status !== undefined) updates.status = data.status;
  if (data.opened_at !== undefined) updates.openedAt = data.opened_at;

  if (Object.keys(updates).length === 0) {
    return getAccountById(accountId);
  }

  const [updated] = await db
    .update(financialAccount)
    .set(updates)
    .where(eq(financialAccount.id, accountId))
    .returning();

  if (!updated) return null;

  // If name changed, sync the BA team name
  if (data.name) {
    await db
      .update(team)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(team.id, updated.teamId));
  }

  const txSums = await fetchTxSums([updated.teamId]);
  return withBalance(updated, txSums);
}

export async function deleteAccount(accountId: string) {
  const account = await getAccountById(accountId);
  if (!account) return null;

  await db.transaction(async (tx) => {
    // Delete financial_account first (references team)
    await tx.delete(financialAccount).where(eq(financialAccount.id, accountId));
    // Delete the BA team (cascades to team_member)
    await tx.delete(team).where(eq(team.id, account.teamId));
  });

  return account;
}

export type AccountAccess = {
  role: 'owner' | 'editor' | 'viewer';
  organizationId: string;
};

/**
 * Check if a user has access to an account via team membership or org membership.
 * Returns the user's role and the account's organizationId, or null if no access.
 */
export async function resolveUserAccountAccess(
  userId: string,
  accountId: string
): Promise<AccountAccess | null> {
  const account = (await getAccountById(accountId)) ?? (await getAccountByTeamId(accountId));
  if (!account) return null;

  // Check org membership (determines role for all accounts in the org)
  const [orgMember] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, account.organizationId), eq(member.userId, userId)))
    .limit(1);

  if (!orgMember) {
    // Not an org member — check team-level access
    const [teamMembership] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.teamId, account.teamId), eq(teamMember.userId, userId)))
      .limit(1);

    const teamRole = teamMembership?.role as 'owner' | 'editor' | 'viewer' | undefined;
    if (!teamRole) return null;
    return { role: teamRole, organizationId: account.organizationId };
  }

  // Map org role to account role
  const role = orgMember.role;
  if (role === 'owner') return { role: 'owner', organizationId: account.organizationId };
  if (role === 'editor') return { role: 'editor', organizationId: account.organizationId };
  if (role === 'member' || role === 'viewer')
    return { role: 'viewer', organizationId: account.organizationId };
  console.warn(`Unknown org role "${role}" for user ${userId}`);
  return null;
}

/**
 * Check if a user has access to an account via team membership or org membership.
 * Returns the user's role or null if no access.
 */
export async function resolveUserAccountRole(
  userId: string,
  accountId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
  const access = await resolveUserAccountAccess(userId, accountId);
  return access?.role ?? null;
}
