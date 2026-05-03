import {
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountSchema,
} from '@moneylens/shared/schemas';
import { Hono } from 'hono';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { requireAuth } from '@/middleware/auth';
import { requireActiveOrg, requireOrgMembership } from '@/middleware/organization';
import type { AccountPermissionVariables } from '@/middleware/permissions';
import { requireAccountAccess } from '@/middleware/permissions';
import { validate } from '@/middleware/validate';
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
accounts.post(
  '/',
  requireActiveOrg,
  requireOrgMembership('editor'),
  validate('json', createAccountSchema),
  async (c) => {
    const user = c.get('user');
    if (!user) throw new UnauthorizedError('Not authenticated');
    const organizationId = c.get('organizationId') as string;

    const account = await createAccount(user.id, organizationId, c.req.valid('json'));
    return c.json(account, 201);
  }
);

// GET /accounts — List accounts in user's active org
accounts.get(
  '/',
  requireActiveOrg,
  requireOrgMembership(),
  validate('query', listAccountsQuerySchema),
  async (c) => {
    const organizationId = c.get('organizationId') as string;
    const { status } = c.req.valid('query');

    const result = await listAccountsByOrg(organizationId, status);
    return c.json(result);
  }
);

// GET /accounts/:id — Single account
accounts.get('/:id', requireAccountAccess('viewer'), async (c) => {
  const accountId = c.get('accountId');
  const account = await getAccountById(accountId);
  return c.json(account);
});

// PATCH /accounts/:id — Update account
accounts.patch(
  '/:id',
  requireAccountAccess('editor'),
  validate('json', updateAccountSchema),
  async (c) => {
    const accountId = c.get('accountId');
    const accountRole = c.get('accountRole');
    const data = c.req.valid('json');

    if (data.status === 'archived' && accountRole !== 'owner') {
      throw new ForbiddenError('Only owners can archive accounts');
    }

    const updated = await updateAccount(accountId, data);
    if (!updated) throw new NotFoundError('Account not found');

    return c.json(updated);
  }
);

// DELETE /accounts/:id — Delete account
accounts.delete('/:id', requireAccountAccess('owner'), async (c) => {
  const accountId = c.get('accountId');

  const deleted = await deleteAccount(accountId);
  if (!deleted) throw new NotFoundError('Account not found');

  return c.json({ success: true });
});

export default accounts;
