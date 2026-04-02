import type { AccountMemberResponse } from '@moneylens/shared/types';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema/auth';
import { financialAccount } from '@/lib/db/schema/financial-account';
import { member } from '@/lib/db/schema/organization';
import { teamMember } from '@/lib/db/schema/team';

/**
 * Lists all members who have access to a financial account.
 * Includes both org-level members (implicit access) and direct team members,
 * each tagged with a `source` flag.
 */
export async function listAccountMembers(accountId: string): Promise<AccountMemberResponse[]> {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.id, accountId))
    .limit(1);

  if (!account) return [];

  // Org-level members (implicit access via organization membership)
  const orgMembers = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, account.organizationId));

  // Direct team members
  const directMembers = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: teamMember.role,
      joinedAt: teamMember.createdAt,
    })
    .from(teamMember)
    .innerJoin(user, eq(user.id, teamMember.userId))
    .where(eq(teamMember.teamId, account.teamId));

  // Build a set of org member userIds to deduplicate
  const orgMemberUserIds = new Set(orgMembers.map((orgMember) => orgMember.userId));

  const roleMapping: Record<string, 'owner' | 'editor' | 'viewer'> = {
    owner: 'owner',
    editor: 'editor',
    member: 'viewer',
    viewer: 'viewer',
  };

  const result: AccountMemberResponse[] = [];

  // Add org members
  for (const orgMember of orgMembers) {
    result.push({
      userId: orgMember.userId,
      name: orgMember.name,
      email: orgMember.email,
      role: roleMapping[orgMember.role] ?? 'viewer',
      source: 'organization',
      joinedAt: orgMember.joinedAt.toISOString(),
    });
  }

  // Add direct members (excluding those already listed via org)
  for (const directMember of directMembers) {
    if (orgMemberUserIds.has(directMember.userId)) continue;

    result.push({
      userId: directMember.userId,
      name: directMember.name,
      email: directMember.email,
      role: (directMember.role as 'owner' | 'editor' | 'viewer') ?? 'viewer',
      source: 'direct',
      joinedAt: directMember.joinedAt.toISOString(),
    });
  }

  return result;
}

/**
 * Removes a direct team member from an account.
 * Returns 'removed' on success, or an error reason string.
 */
export async function removeAccountMember(
  accountId: string,
  targetUserId: string
): Promise<{ success: true } | { error: string; code: 'BAD_REQUEST' | 'NOT_FOUND' }> {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.id, accountId))
    .limit(1);

  if (!account) return { error: 'Account not found', code: 'NOT_FOUND' };

  // Check if user is an org-level member (cannot be removed at account level)
  const [orgMembership] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, account.organizationId), eq(member.userId, targetUserId)))
    .limit(1);

  if (orgMembership) {
    return {
      error:
        'Cannot remove organization-level member at account level. Remove them from the workspace instead.',
      code: 'BAD_REQUEST',
    };
  }

  // Find and delete the direct team membership
  const [deleted] = await db
    .delete(teamMember)
    .where(and(eq(teamMember.teamId, account.teamId), eq(teamMember.userId, targetUserId)))
    .returning();

  if (!deleted) {
    return { error: 'User is not a direct member of this account', code: 'NOT_FOUND' };
  }

  return { success: true };
}

type ServiceError = { error: string; code: 'BAD_REQUEST' | 'NOT_FOUND' };

/**
 * Atomically changes a member's access level between workspace and account.
 * Uses a DB transaction to avoid the cascade issue with Better Auth's remove-member.
 */
export async function changeAccessLevel(
  accountId: string,
  targetUserId: string,
  target: 'workspace' | 'account',
  role: 'editor' | 'viewer',
  targetAccountId?: string
): Promise<{ success: true } | ServiceError> {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.id, accountId))
    .limit(1);

  if (!account) return { error: 'Account not found', code: 'NOT_FOUND' };

  // Guard: cannot change the org owner's access level
  const [orgMembership] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, account.organizationId), eq(member.userId, targetUserId)))
    .limit(1);

  if (orgMembership?.role === 'owner') {
    return { error: 'Cannot change the workspace owner access level', code: 'BAD_REQUEST' };
  }

  if (target === 'account') {
    // Workspace → Account: move from org member to direct team member
    if (!targetAccountId) {
      return { error: 'targetAccountId is required when target is account', code: 'BAD_REQUEST' };
    }

    if (!orgMembership) {
      return { error: 'User is not an organization member', code: 'BAD_REQUEST' };
    }

    // Look up the target account to get its teamId
    const [targetAccount] = await db
      .select()
      .from(financialAccount)
      .where(eq(financialAccount.id, targetAccountId))
      .limit(1);

    if (!targetAccount) return { error: 'Target account not found', code: 'NOT_FOUND' };

    await db.transaction(async (transaction) => {
      await transaction.insert(teamMember).values({
        id: crypto.randomUUID(),
        teamId: targetAccount.teamId,
        userId: targetUserId,
        role,
        createdAt: new Date(),
      });

      await transaction
        .delete(member)
        .where(
          and(eq(member.organizationId, account.organizationId), eq(member.userId, targetUserId))
        );
    });
  } else {
    // Account → Workspace: move from direct team member to org member
    const [directMembership] = await db
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.teamId, account.teamId), eq(teamMember.userId, targetUserId)))
      .limit(1);

    if (!directMembership) {
      return { error: 'User is not a direct member of this account', code: 'NOT_FOUND' };
    }

    await db.transaction(async (transaction) => {
      await transaction.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: account.organizationId,
        userId: targetUserId,
        role,
        createdAt: new Date(),
      });

      await transaction
        .delete(teamMember)
        .where(and(eq(teamMember.teamId, account.teamId), eq(teamMember.userId, targetUserId)));
    });
  }

  return { success: true };
}

/**
 * Updates the role of a direct team member on an account.
 * Org-level members must have their role changed at the workspace level instead.
 */
export async function updateAccountMemberRole(
  accountId: string,
  targetUserId: string,
  newRole: 'editor' | 'viewer'
): Promise<{ success: true } | ServiceError> {
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.id, accountId))
    .limit(1);

  if (!account) return { error: 'Account not found', code: 'NOT_FOUND' };

  // Guard: cannot change org-level member role at account level
  const [orgMembership] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, account.organizationId), eq(member.userId, targetUserId)))
    .limit(1);

  if (orgMembership) {
    return {
      error:
        'Cannot change organization-level member role at account level. Use workspace settings instead.',
      code: 'BAD_REQUEST',
    };
  }

  const [updated] = await db
    .update(teamMember)
    .set({ role: newRole })
    .where(and(eq(teamMember.teamId, account.teamId), eq(teamMember.userId, targetUserId)))
    .returning();

  if (!updated) {
    return { error: 'User is not a direct member of this account', code: 'NOT_FOUND' };
  }

  return { success: true };
}
