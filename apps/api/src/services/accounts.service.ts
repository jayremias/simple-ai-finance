import type { CreateAccountInput, UpdateAccountInput } from '@moneylens/shared/types';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { financialAccount } from '@/lib/db/schema/financial-account';
import { member } from '@/lib/db/schema/organization';
import { team, teamMember } from '@/lib/db/schema/team';

export async function createAccount(
  userId: string,
  organizationId: string,
  data: CreateAccountInput
) {
  // 1. Create team via BA API (external call, cannot be part of DB transaction)
  const createdTeam = await auth.api.createTeam({
    body: {
      name: data.name,
      organizationId,
    },
  });

  try {
    // 2-3. Insert team member + financial account in a transaction
    const [account] = await db.transaction(async (tx) => {
      await tx.insert(teamMember).values({
        id: crypto.randomUUID(),
        teamId: createdTeam.id,
        userId,
      });

      return tx
        .insert(financialAccount)
        .values({
          teamId: createdTeam.id,
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

    return account;
  } catch (error) {
    // Rollback: delete the orphaned team created in step 1
    await db
      .delete(team)
      .where(eq(team.id, createdTeam.id))
      .catch((cleanupErr) => {
        console.error('Failed to clean up orphaned team:', createdTeam.id, cleanupErr);
      });
    throw error;
  }
}

export async function listAccountsByOrg(organizationId: string, status?: string) {
  const conditions = [eq(financialAccount.organizationId, organizationId)];

  if (status) {
    conditions.push(eq(financialAccount.status, status));
  }

  return db
    .select()
    .from(financialAccount)
    .where(and(...conditions))
    .orderBy(financialAccount.sortOrder);
}

export async function getAccountById(accountId: string) {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.id, accountId))
    .limit(1);

  return account ?? null;
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

  // If name changed, sync the BA team name
  if (data.name && updated) {
    await db
      .update(team)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(team.id, updated.teamId));
  }

  return updated ?? null;
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

/**
 * Check if a user has access to an account via team membership or org membership.
 * Returns the user's role or null if no access.
 */
export async function resolveUserAccountRole(
  userId: string,
  accountId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
  const account = await getAccountById(accountId);
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

    return teamMembership ? 'viewer' : null;
  }

  // Map org role to account role
  const role = orgMember.role;
  if (role === 'owner') return 'owner';
  if (role === 'editor') return 'editor';
  if (role === 'member' || role === 'viewer') return 'viewer';
  console.warn(`Unknown org role "${role}" for user ${userId}`);
  return null;
}
