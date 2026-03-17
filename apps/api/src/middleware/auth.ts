import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { auth, type Session } from '@/lib/auth';
import { db } from '@/lib/db';
import { member } from '@/lib/db/schema/organization';

export type AuthVariables = {
  user: Session['user'] | null;
  session: Session['session'] | null;
};

/**
 * Populates user/session on every request from cookies or bearer token.
 * If activeOrganizationId is missing from the session (e.g. old sessions created
 * before the org hook was fixed), it falls back to a DB lookup.
 * Does NOT block unauthenticated requests — use requireAuth for that.
 */
export const sessionMiddleware = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const result = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  let sessionData = result?.session ?? null;

  if (sessionData && !sessionData.activeOrganizationId) {
    const [orgMember] = await db
      .select()
      .from(member)
      .where(eq(member.userId, sessionData.userId))
      .limit(1);
    if (orgMember) {
      sessionData = { ...sessionData, activeOrganizationId: orgMember.organizationId };
    }
  }

  c.set('user', result?.user ?? null);
  c.set('session', sessionData);

  await next();
});

/**
 * Blocks unauthenticated requests with 401.
 * Must be used after sessionMiddleware.
 */
export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
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

  await next();
});
