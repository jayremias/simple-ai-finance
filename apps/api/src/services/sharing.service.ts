import { auth } from '@/lib/auth';
import { getAccountById } from '@/services/accounts.service';

/**
 * Create an invitation for a user to access a specific financial account.
 * Uses Better Auth's createInvitation API under the hood.
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

  const invitation = await auth.api.createInvitation({
    body: {
      email,
      role: role as 'viewer' | 'editor' | 'owner',
      organizationId,
      teamId: account.teamId,
    },
    headers: requestHeaders,
  });

  return invitation;
}

export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Account ${accountId} not found`);
    this.name = 'AccountNotFoundError';
  }
}
