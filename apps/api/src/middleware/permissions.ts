import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { StatusCodes } from 'http-status-codes';
import { resolveUserAccountAccess } from '@/services/accounts.service';
import { getAccountIdForTransaction } from '@/services/transactions.service';
import type { AuthVariables } from './auth';

export type AccountRole = 'owner' | 'editor' | 'viewer';

/**
 * Describes where to extract the target `accountId` from the request.
 *
 * - `param`  — URL parameter (default: `"id"`)
 * - `body`   — JSON request body field (default: `"accountId"`)
 * - `lookup` — DB lookup via a child table's `:id` param (e.g. transaction → account_id)
 */
export type AccountIdSource =
  | { from: 'param'; name?: string }
  | { from: 'body'; name?: string }
  | { from: 'query'; name?: string }
  | { from: 'lookup'; table: 'transaction' | 'statement' };

export type AccountPermissionVariables = AuthVariables & {
  accountId: string;
  accountRole: AccountRole;
  organizationId: string;
};

/**
 * Checks that the authenticated user has access to the target financial
 * account via team or org membership. Sets `c.var.accountId` and
 * `c.var.accountRole` for downstream handlers.
 */
export function requireAccountAccess(
  minimumRole: AccountRole = 'viewer',
  source: AccountIdSource = { from: 'param', name: 'id' }
) {
  return createMiddleware<{ Variables: AccountPermissionVariables }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        StatusCodes.UNAUTHORIZED
      );
    }

    const accountId = await resolveAccountId(c, source);
    if (!accountId) {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Account ID required',
          },
        },
        StatusCodes.BAD_REQUEST
      );
    }

    const access = await resolveUserAccountAccess(user.id, accountId);
    if (!access) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'No access to this account',
          },
        },
        StatusCodes.FORBIDDEN
      );
    }

    // Check minimum role level
    const roleLevel = { owner: 3, editor: 2, viewer: 1 } as const;
    if (roleLevel[access.role] < roleLevel[minimumRole]) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        },
        StatusCodes.FORBIDDEN
      );
    }

    c.set('accountId', accountId);
    c.set('accountRole', access.role);
    c.set('organizationId', access.organizationId);

    await next();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveAccountId(c: Context, source: AccountIdSource): Promise<string | null> {
  switch (source.from) {
    case 'param':
      return c.req.param(source.name ?? 'id') ?? null;

    case 'body': {
      const body = await c.req.json();
      return body[source.name ?? 'accountId'] ?? null;
    }

    case 'query':
      return c.req.query(source.name ?? 'accountId') ?? null;

    case 'lookup': {
      if (source.table === 'transaction') {
        const transactionId = c.req.param('id');
        if (!transactionId) return null;
        return getAccountIdForTransaction(transactionId);
      }
      throw new Error(`Account ID lookup from "${source.table}" table is not yet implemented.`);
    }
  }
}
