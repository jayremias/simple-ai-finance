import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '@moneylens/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import { type AccountPermissionVariables, requireAccountAccess } from '@/middleware/permissions';
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

// GET /transactions — org-scoped (list all transactions in org)
transactions.get('/', requireActiveOrg, requireOrgMembership(), async (c) => {
  const organizationId = c.get('organizationId');

  const parsed = listTransactionsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  const result = await listTransactions(organizationId, parsed.data);
  return c.json(result);
});

// GET /transactions/payees — org-scoped
transactions.get('/payees', requireActiveOrg, requireOrgMembership(), async (c) => {
  const organizationId = c.get('organizationId');

  const parsed = payeeQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  const data = await listPayees(organizationId, parsed.data.q);
  return c.json({ data });
});

// GET /transactions/:id — org-scoped
transactions.get('/:id', requireActiveOrg, requireOrgMembership(), async (c) => {
  const organizationId = c.get('organizationId');

  const tx = await getTransactionById(c.req.param('id'), organizationId);
  if (!tx) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json(tx);
});

// POST /transactions — account-scoped (shared users can create via team access)
transactions.post(
  '/',
  requireAccountAccess('editor', { from: 'body', name: 'accountId' }),
  async (c) => {
    const organizationId = c.get('organizationId');

    const body = await c.req.json();
    const parsed = createTransactionSchema.safeParse(body);
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

    const tx = await createTransaction(organizationId, parsed.data);
    return c.json(tx, 201);
  }
);

// PATCH /transactions/:id — org-scoped
transactions.patch('/:id', requireActiveOrg, requireOrgMembership(), async (c) => {
  const organizationId = c.get('organizationId');

  const body = await c.req.json();
  const parsed = updateTransactionSchema.safeParse(body);
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

  const updated = await updateTransaction(c.req.param('id'), organizationId, parsed.data);
  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json(updated);
});

// DELETE /transactions/:id — org-scoped
transactions.delete('/:id', requireActiveOrg, requireOrgMembership(), async (c) => {
  const organizationId = c.get('organizationId');

  const deleted = await deleteTransaction(c.req.param('id'), organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json({ success: true });
});

export default transactions;
