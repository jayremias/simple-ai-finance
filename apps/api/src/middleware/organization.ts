import { and, eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { db } from '@/lib/db';
import { member } from '@/lib/db/schema/organization';
import type { AuthVariables } from './auth';

// ---------------------------------------------------------------------------
// Organization context variables
// ---------------------------------------------------------------------------

export type OrgVariables = AuthVariables & {
  organizationId: string;
};

export type OrgMembershipVariables = OrgVariables & {
  orgRole: string;
};

// ---------------------------------------------------------------------------
// requireActiveOrg — ensures session has an active organization
// ---------------------------------------------------------------------------

/**
 * Checks that the authenticated session has an active organization.
 * Returns 400 if missing. Sets `c.var.organizationId` for downstream handlers.
 *
 * Must be used after `sessionMiddleware` + `requireAuth`.
 */
export const requireActiveOrg = createMiddleware<{ Variables: OrgVariables }>(async (c, next) => {
  const organizationId = c.get('session')?.activeOrganizationId;
  if (!organizationId) {
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: 'No active organization. Set an active organization first.',
        },
      },
      400
    );
  }
  c.set('organizationId', organizationId);
  await next();
});

// ---------------------------------------------------------------------------
// requireOrgMembership — ensures user is a member of the active organization
// ---------------------------------------------------------------------------

/**
 * Checks that the authenticated user is a member of the active organization
 * with at least the specified role. Returns 403 if not a member or insufficient
 * role. Sets `c.var.orgRole` for downstream handlers.
 *
 * Must be used after `requireActiveOrg`.
 */
export function requireOrgMembership(minimumRole: 'owner' | 'editor' | 'member' = 'member') {
  const roleLevel = { owner: 3, editor: 2, member: 1 } as const;

  return createMiddleware<{ Variables: OrgMembershipVariables }>(async (c, next) => {
    const user = c.get('user');
    const organizationId = c.get('organizationId');

    if (!user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const [orgMember] = await db
      .select()
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, user.id)))
      .limit(1);

    if (!orgMember) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } },
        403
      );
    }

    const memberRoleLevel = roleLevel[orgMember.role as keyof typeof roleLevel] ?? 0;
    if (memberRoleLevel < roleLevel[minimumRole]) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    c.set('orgRole', orgMember.role);
    await next();
  });
}
