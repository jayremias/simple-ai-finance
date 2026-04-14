import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { PlatformPermission } from '@/lib/permissions/constants';
import { type PLATFORM_ROLES, platformRoleHasPermission } from '@/lib/permissions/constants';
import { resolveUserAccountAccess } from '@/services/accounts.service';
import type { AuthVariables } from './auth';

// ---------------------------------------------------------------------------
// Platform permission middleware
// ---------------------------------------------------------------------------

/**
 * Checks that the authenticated user's platform role includes the given
 * permission. Returns 401 if unauthenticated, 403 if the role lacks access.
 *
 * Zero DB queries — resolves entirely from the session context.
 * Must be used after `sessionMiddleware` + `requireAuth`.
 */
export function requirePlatformPermission(permission: PlatformPermission) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    const role = (user.role ?? 'user') as keyof typeof PLATFORM_ROLES;

    if (!platformRoleHasPermission(role, permission)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        },
        403
      );
    }

    await next();
  });
}

// ---------------------------------------------------------------------------
// Account permission middleware
// ---------------------------------------------------------------------------

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
        401
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
        400
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
        403
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
        403
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

    case 'lookup':
      // TODO: Implement when transaction/statement tables exist.
      throw new Error(`Account ID lookup from "${source.table}" table is not yet implemented.`);
  }
}
