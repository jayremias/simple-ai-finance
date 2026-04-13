import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema/auth';
import { notification } from '@/lib/db/schema/notification';
import { invitation } from '@/lib/db/schema/organization';
import { teamMember } from '@/lib/db/schema/team';
import { getAccountById } from '@/services/accounts.service';
import { createNotification } from '@/services/notifications.service';

/**
 * Create an invitation for a user to access a specific financial account.
 * Uses Better Auth's createInvitation API under the hood.
 * Also creates a notification for the invited user (if they exist).
 */
export async function inviteUserToAccount(
  organizationId: string,
  accountId: string,
  email: string,
  role: 'viewer' | 'editor',
  requestHeaders: Headers
) {
  const account = await getAccountById(accountId);
  if (!account) {
    throw new AccountNotFoundError(accountId);
  }

  if (account.organizationId !== organizationId) {
    throw new AccountNotFoundError(accountId);
  }

  const invitationResult = await auth.api.createInvitation({
    body: {
      email,
      role: role as 'viewer' | 'editor' | 'owner',
      organizationId,
      teamId: account.teamId,
    },
    headers: requestHeaders,
  });

  // Create notification for the invited user if they already have an account
  const [invitedUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (invitedUser) {
    await createNotification(invitedUser.id, 'account_invitation', 'Account invitation', {
      data: {
        invitationId: invitationResult?.id ?? null,
        accountId,
        accountName: account.name,
        role,
      },
    });
  }

  return invitationResult;
}

/**
 * Accept a pending invitation. Adds the user to the team (account-level access only).
 * Does NOT use BA's acceptInvitation to avoid adding user as org member.
 */
export async function acceptInvitation(invitationId: string, userId: string) {
  // Find the invitation
  const [invite] = await db
    .select()
    .from(invitation)
    .where(and(eq(invitation.id, invitationId), eq(invitation.status, 'pending')))
    .limit(1);

  if (!invite) {
    throw new InvitationNotFoundError(invitationId);
  }

  // Verify the invitation is for this user
  const [invitedUser] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!invitedUser || invitedUser.email !== invite.email) {
    throw new InvitationNotFoundError(invitationId);
  }

  if (!invite.teamId) {
    throw new Error('Invitation has no team ID — cannot accept account-level invitation');
  }

  // Add user to the team (account-level access)
  await db.insert(teamMember).values({
    id: crypto.randomUUID(),
    teamId: invite.teamId,
    userId,
    role: invite.role ?? 'viewer',
    createdAt: new Date(),
  });

  // Update invitation status to accepted
  await db.update(invitation).set({ status: 'accepted' }).where(eq(invitation.id, invitationId));

  // Mark related notification as read
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), eq(notification.type, 'account_invitation')));

  return { success: true };
}

export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Account ${accountId} not found`);
    this.name = 'AccountNotFoundError';
  }
}

export class InvitationNotFoundError extends Error {
  constructor(invitationId: string) {
    super(`Invitation ${invitationId} not found or already accepted`);
    this.name = 'InvitationNotFoundError';
  }
}
