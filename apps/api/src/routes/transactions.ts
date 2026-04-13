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

const transactions = new Hono<{ Variables: OrgMembershipVariables }>()
  .basePath('/transactions')
  .use(requireAuth)
  .use(requireActiveOrg)
  .use(requireOrgMembership());

// GET /transactions
transactions.get('/', async (c) => {
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

// GET /transactions/payees
transactions.get('/payees', async (c) => {
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

// GET /transactions/:id
transactions.get('/:id', async (c) => {
  const organizationId = c.get('organizationId');

  const tx = await getTransactionById(c.req.param('id'), organizationId);
  if (!tx) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json(tx);
});

// POST /transactions
transactions.post('/', async (c) => {
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
});

// PATCH /transactions/:id
transactions.patch('/:id', async (c) => {
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

// DELETE /transactions/:id
transactions.delete('/:id', async (c) => {
  const organizationId = c.get('organizationId');

  const deleted = await deleteTransaction(c.req.param('id'), organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json({ success: true });
});

export default transactions;
