import {
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountSchema,
} from '@moneylens/shared/schemas';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Session } from '@/lib/auth';
import { db } from '@/lib/db';
import { member } from '@/lib/db/schema/organization';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import {
  createAccount,
  deleteAccount,
  getAccountById,
  listAccountsByOrg,
  resolveUserAccountRole,
  updateAccount,
} from '@/services/accounts.service';

const accounts = new Hono<{ Variables: AuthVariables }>().basePath('/accounts').use(requireAuth);

// POST /accounts — Create account in user's active org
accounts.post('/', async (c) => {
  const session = c.get('session');
  const user = c.get('user') as Session['user'];

  const organizationId = session?.activeOrganizationId;
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

  // Verify org membership and role (viewers cannot create accounts)
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

  if (orgMember.role !== 'owner' && orgMember.role !== 'editor') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
  }

  const body = await c.req.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  const account = await createAccount(user.id, organizationId, parsed.data);
  return c.json(account, 201);
});

// GET /accounts — List accounts in user's active org
accounts.get('/', async (c) => {
  const session = c.get('session');

  const organizationId = session?.activeOrganizationId;
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

  const query = listAccountsQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: query.error.flatten(),
        },
      },
      400
    );
  }

  const accounts = await listAccountsByOrg(organizationId, query.data.status);
  return c.json(accounts);
});

// GET /accounts/:id — Single account
accounts.get('/:id', async (c) => {
  const user = c.get('user') as Session['user'];
  const accountId = c.req.param('id');

  const role = await resolveUserAccountRole(user.id, accountId);
  if (!role) {
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

  const account = await getAccountById(accountId);
  return c.json(account);
});

// PATCH /accounts/:id — Update account
accounts.patch('/:id', async (c) => {
  const user = c.get('user') as Session['user'];
  const accountId = c.req.param('id');

  const role = await resolveUserAccountRole(user.id, accountId);
  if (!role) {
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

  if (role === 'viewer') {
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

  const body = await c.req.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  // Only owners can archive/delete status changes
  if (parsed.data.status === 'archived' && role !== 'owner') {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Only owners can archive accounts',
        },
      },
      403
    );
  }

  const updated = await updateAccount(accountId, parsed.data);
  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
  }

  return c.json(updated);
});

// DELETE /accounts/:id — Delete account
accounts.delete('/:id', async (c) => {
  const user = c.get('user') as Session['user'];
  const accountId = c.req.param('id');

  const role = await resolveUserAccountRole(user.id, accountId);
  if (role !== 'owner') {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Only owners can delete accounts',
        },
      },
      403
    );
  }

  const deleted = await deleteAccount(accountId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
  }

  return c.json({ success: true });
});

export default accounts;
