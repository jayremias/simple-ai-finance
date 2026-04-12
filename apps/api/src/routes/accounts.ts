import {
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountSchema,
} from '@moneylens/shared/schemas';
import { Hono } from 'hono';
import { requireAuth } from '@/middleware/auth';
import { requireActiveOrg, requireOrgMembership } from '@/middleware/organization';
import type { AccountPermissionVariables } from '@/middleware/permissions';
import { requireAccountAccess } from '@/middleware/permissions';
import {
  createAccount,
  deleteAccount,
  getAccountById,
  listAccountsByOrg,
  updateAccount,
} from '@/services/accounts.service';

const accounts = new Hono<{ Variables: AccountPermissionVariables }>()
  .basePath('/accounts')
  .use(requireAuth);

// POST /accounts — Create account in user's active org
accounts.post('/', requireActiveOrg, requireOrgMembership('editor'), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }
  const organizationId = c.get('organizationId') as string;

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
accounts.get('/', requireActiveOrg, requireOrgMembership(), async (c) => {
  const organizationId = c.get('organizationId') as string;

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

  const result = await listAccountsByOrg(organizationId, query.data.status);
  return c.json(result);
});

// GET /accounts/:id — Single account
accounts.get('/:id', requireAccountAccess('viewer'), async (c) => {
  const accountId = c.get('accountId');
  const account = await getAccountById(accountId);
  return c.json(account);
});

// PATCH /accounts/:id — Update account
accounts.patch('/:id', requireAccountAccess('editor'), async (c) => {
  const accountId = c.get('accountId');
  const accountRole = c.get('accountRole');

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
  if (parsed.data.status === 'archived' && accountRole !== 'owner') {
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
accounts.delete('/:id', requireAccountAccess('owner'), async (c) => {
  const accountId = c.get('accountId');

  const deleted = await deleteAccount(accountId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
  }

  return c.json({ success: true });
});

export default accounts;
