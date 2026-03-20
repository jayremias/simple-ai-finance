import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from '@/services/transactions.service';

const transactions = new Hono<{ Variables: AuthVariables }>()
  .basePath('/transactions')
  .use(requireAuth);

// GET /transactions
transactions.get('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

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

// GET /transactions/:id
transactions.get('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const tx = await getTransactionById(c.req.param('id'), organizationId);
  if (!tx) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json(tx);
});

// POST /transactions
transactions.post('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

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
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

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
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const deleted = await deleteTransaction(c.req.param('id'), organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
  }
  return c.json({ success: true });
});

export default transactions;
