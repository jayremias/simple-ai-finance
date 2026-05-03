import { createTagSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import { createTag, deleteTag, listTags } from '@/services/tags.service';

const tags = new Hono<{ Variables: OrgMembershipVariables }>()
  .use(requireAuth)
  .use(requireActiveOrg)
  .use(requireOrgMembership());

// GET /tags
tags.get('/', async (c) => {
  const organizationId = c.get('organizationId');
  const list = await listTags(organizationId);
  return c.json(
    list.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))
  );
});

// POST /tags
tags.post('/', async (c) => {
  const organizationId = c.get('organizationId');

  const body = await c.req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      StatusCodes.BAD_REQUEST
    );
  }

  const created = await createTag(organizationId, parsed.data);
  return c.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    StatusCodes.CREATED
  );
});

// DELETE /tags/:id
tags.delete('/:id', async (c) => {
  const organizationId = c.get('organizationId');
  const id = c.req.param('id');

  const deleted = await deleteTag(id, organizationId);
  if (!deleted) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Tag not found' } },
      StatusCodes.NOT_FOUND
    );
  }
  return c.json({ success: true });
});

export default tags;
