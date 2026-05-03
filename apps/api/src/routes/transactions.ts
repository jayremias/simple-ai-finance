import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '@moneylens/shared';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@/lib/db';
import { member } from '@/lib/db/schema/organization';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import { type AccountPermissionVariables, requireAccountAccess } from '@/middleware/permissions';
import { validate } from '@/middleware/validate';
import { resolveUserAccountAccess } from '@/services/accounts.service';
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listPayees,
  listTransactions,
  updateTransaction,
} from '@/services/transactions.service';

const payeeQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
});

const transactions = new Hono<{
  Variables: OrgMembershipVariables & AccountPermissionVariables;
}>()
  .basePath('/transactions')
  .use(requireAuth);

// GET /transactions — dual path: account-scoped (with accountId) or org-scoped (without)
transactions.get('/', validate('query', listTransactionsSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw new UnauthorizedError('Not authenticated');

  const data = c.req.valid('query');
  let organizationId: string;

  if (data.accountId) {
    // Account-scoped: shared users can list via team membership
    const access = await resolveUserAccountAccess(user.id, data.accountId);
    if (!access) throw new ForbiddenError('No access to this account');
    organizationId = access.organizationId;
  } else {
    // Org-scoped: require active org + membership
    const activeOrgId = c.get('session')?.activeOrganizationId;
    if (!activeOrgId) {
      throw new BadRequestError('No active organization. Set an active organization first.');
    }
    const [orgMember] = await db
      .select()
      .from(member)
      .where(and(eq(member.organizationId, activeOrgId), eq(member.userId, user.id)))
      .limit(1);
    if (!orgMember) throw new ForbiddenError('Not a member of this organization');
    organizationId = activeOrgId;
  }

  const result = await listTransactions(organizationId, data);
  return c.json(result);
});

// GET /transactions/payees — org-scoped
transactions.get(
  '/payees',
  requireActiveOrg,
  requireOrgMembership(),
  validate('query', payeeQuerySchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const { q } = c.req.valid('query');

    const data = await listPayees(organizationId, q);
    return c.json({ data });
  }
);

// GET /transactions/:id — account-scoped (shared users can read via team access)
transactions.get(
  '/:id',
  requireAccountAccess('viewer', { from: 'lookup', table: 'transaction' }),
  async (c) => {
    const organizationId = c.get('organizationId');

    const tx = await getTransactionById(c.req.param('id'), organizationId);
    if (!tx) throw new NotFoundError('Transaction not found');
    return c.json(tx);
  }
);

// POST /transactions — account-scoped (shared users can create via team access)
transactions.post(
  '/',
  requireAccountAccess('editor', { from: 'body', name: 'accountId' }),
  validate('json', createTransactionSchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const user = c.get('user');
    if (!user) throw new UnauthorizedError('Not authenticated');

    const tx = await createTransaction(organizationId, user.id, c.req.valid('json'));
    return c.json(tx, 201);
  }
);

// PATCH /transactions/:id — account-scoped (looks up accountId from transaction)
transactions.patch(
  '/:id',
  requireAccountAccess('editor', { from: 'lookup', table: 'transaction' }),
  validate('json', updateTransactionSchema),
  async (c) => {
    const organizationId = c.get('organizationId');

    const updated = await updateTransaction(c.req.param('id'), organizationId, c.req.valid('json'));
    if (!updated) throw new NotFoundError('Transaction not found');
    return c.json(updated);
  }
);

// DELETE /transactions/:id — account-scoped (looks up accountId from transaction)
transactions.delete(
  '/:id',
  requireAccountAccess('editor', { from: 'lookup', table: 'transaction' }),
  async (c) => {
    const organizationId = c.get('organizationId');

    const deleted = await deleteTransaction(c.req.param('id'), organizationId);
    if (!deleted) throw new NotFoundError('Transaction not found');
    return c.json({ success: true });
  }
);

export default transactions;
