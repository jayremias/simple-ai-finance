import {
  createRecurringRuleSchema,
  listRecurringRulesSchema,
  updateRecurringRuleSchema,
} from '@moneylens/shared';
import { Hono } from 'hono';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRuleById,
  listRecurringRules,
  pauseRecurringRule,
  resumeRecurringRule,
  updateRecurringRule,
} from '@/services/recurring.service';

const recurring = new Hono<{ Variables: OrgMembershipVariables }>()
  .basePath('/recurring')
  .use(requireAuth)
  .use(requireActiveOrg)
  .use(requireOrgMembership());

// POST /recurring
recurring.post('/', async (c) => {
  const organizationId = c.get('organizationId');

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

  const rule = await createRecurringRule(organizationId, parsed.data);
  return c.json(rule, 201);
});

// GET /recurring
recurring.get('/', async (c) => {
  const organizationId = c.get('organizationId');

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
  const organizationId = c.get('organizationId');

  const rule = await getRecurringRuleById(c.req.param('id'), organizationId);
  if (!rule) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(rule);
});

// PATCH /recurring/:id
recurring.patch('/:id', async (c) => {
  const organizationId = c.get('organizationId');

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
  const organizationId = c.get('organizationId');

  const deleted = await deleteRecurringRule(c.req.param('id'), organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json({ success: true });
});

// POST /recurring/:id/pause
recurring.post('/:id/pause', async (c) => {
  const organizationId = c.get('organizationId');

  const paused = await pauseRecurringRule(c.req.param('id'), organizationId);
  if (!paused) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(paused);
});

// POST /recurring/:id/resume
recurring.post('/:id/resume', async (c) => {
  const organizationId = c.get('organizationId');

  const resumed = await resumeRecurringRule(c.req.param('id'), organizationId);
  if (!resumed) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Recurring rule not found' } }, 404);
  }
  return c.json(resumed);
});

export default recurring;
