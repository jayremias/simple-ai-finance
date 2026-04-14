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
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import { type AccountPermissionVariables, requireAccountAccess } from '@/middleware/permissions';
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
transactions.get('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
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

  let organizationId: string;

  if (parsed.data.accountId) {
    // Account-scoped: shared users can list via team membership
    const access = await resolveUserAccountAccess(user.id, parsed.data.accountId);
    if (!access) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'No access to this account' } }, 403);
    }
    organizationId = access.organizationId;
  } else {
    // Org-scoped: require active org + membership
    const activeOrgId = c.get('session')?.activeOrganizationId;
    if (!activeOrgId) {
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
    const [orgMember] = await db
      .select()
      .from(member)
      .where(and(eq(member.organizationId, activeOrgId), eq(member.userId, user.id)))
      .limit(1);
    if (!orgMember) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } },
        403
      );
    }
    organizationId = activeOrgId;
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

// PATCH /transactions/:id — account-scoped (looks up accountId from transaction)
transactions.patch(
  '/:id',
  requireAccountAccess('editor', { from: 'lookup', table: 'transaction' }),
  async (c) => {
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
  }
);

// DELETE /transactions/:id — account-scoped (looks up accountId from transaction)
transactions.delete(
  '/:id',
  requireAccountAccess('editor', { from: 'lookup', table: 'transaction' }),
  async (c) => {
    const organizationId = c.get('organizationId');

    const deleted = await deleteTransaction(c.req.param('id'), organizationId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } }, 404);
    }
    return c.json({ success: true });
  }
);

export default transactions;
