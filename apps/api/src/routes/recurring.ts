import {
  createRecurringRuleSchema,
  listRecurringRulesSchema,
  updateRecurringRuleSchema,
} from '@moneylens/shared';
import { Hono } from 'hono';
import { NotFoundError } from '@/lib/errors';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import { validate } from '@/middleware/validate';
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
recurring.post('/', validate('json', createRecurringRuleSchema), async (c) => {
  const organizationId = c.get('organizationId');

  const rule = await createRecurringRule(organizationId, c.req.valid('json'));
  return c.json(rule, 201);
});

// GET /recurring
recurring.get('/', validate('query', listRecurringRulesSchema), async (c) => {
  const organizationId = c.get('organizationId');

  const result = await listRecurringRules(organizationId, c.req.valid('query'));
  return c.json(result);
});

// GET /recurring/:id
recurring.get('/:id', async (c) => {
  const organizationId = c.get('organizationId');

  const rule = await getRecurringRuleById(c.req.param('id'), organizationId);
  if (!rule) throw new NotFoundError('Recurring rule not found');
  return c.json(rule);
});

// PATCH /recurring/:id
recurring.patch('/:id', validate('json', updateRecurringRuleSchema), async (c) => {
  const organizationId = c.get('organizationId');

  const updated = await updateRecurringRule(c.req.param('id'), organizationId, c.req.valid('json'));
  if (!updated) throw new NotFoundError('Recurring rule not found');
  return c.json(updated);
});

// DELETE /recurring/:id
recurring.delete('/:id', async (c) => {
  const organizationId = c.get('organizationId');

  const deleted = await deleteRecurringRule(c.req.param('id'), organizationId);
  if (!deleted) throw new NotFoundError('Recurring rule not found');
  return c.json({ success: true });
});

// POST /recurring/:id/pause
recurring.post('/:id/pause', async (c) => {
  const organizationId = c.get('organizationId');

  const paused = await pauseRecurringRule(c.req.param('id'), organizationId);
  if (!paused) throw new NotFoundError('Recurring rule not found');
  return c.json(paused);
});

// POST /recurring/:id/resume
recurring.post('/:id/resume', async (c) => {
  const organizationId = c.get('organizationId');

  const resumed = await resumeRecurringRule(c.req.param('id'), organizationId);
  if (!resumed) throw new NotFoundError('Recurring rule not found');
  return c.json(resumed);
});

export default recurring;
