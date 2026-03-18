import {
  createRecurringRuleSchema,
  listRecurringRulesSchema,
  updateRecurringRuleSchema,
} from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRuleById,
  listRecurringRules,
  pauseRecurringRule,
  resumeRecurringRule,
  updateRecurringRule,
} from '@/services/recurring.service';

const recurring = new Hono<{ Variables: AuthVariables }>().basePath('/recurring').use(requireAuth);

// POST /recurring
recurring.post('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const body = await c.req.json();
  const parsed = createRecurringRuleSchema.safeParse(body);
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

  try {
    const rule = await createRecurringRule(organizationId, parsed.data);
    return c.json(rule, 201);
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as { code?: string }).code;
      if (code === 'NOT_FOUND') {
        return c.json({ error: { code: 'NOT_FOUND', message: err.message } }, 404);
      }
    }
    throw err;
  }
});

// GET /recurring
recurring.get('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const parsed = listRecurringRulesSchema.safeParse(c.req.query());
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

  const result = await listRecurringRules(organizationId, parsed.data);
  return c.json(result);
});

// GET /recurring/:id
recurring.get('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const rule = await getRecurringRuleById(c.req.param('id'), organizationId);
  if (!rule) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(rule);
});

// PATCH /recurring/:id
recurring.patch('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const body = await c.req.json();
  const parsed = updateRecurringRuleSchema.safeParse(body);
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

  const updated = await updateRecurringRule(c.req.param('id'), organizationId, parsed.data);
  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(updated);
});

// DELETE /recurring/:id
recurring.delete('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const deleted = await deleteRecurringRule(c.req.param('id'), organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json({ success: true });
});

// POST /recurring/:id/pause
recurring.post('/:id/pause', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const paused = await pauseRecurringRule(c.req.param('id'), organizationId);
  if (!paused) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(paused);
});

// POST /recurring/:id/resume
recurring.post('/:id/resume', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const resumed = await resumeRecurringRule(c.req.param('id'), organizationId);
  if (!resumed) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(resumed);
});

export default recurring;
