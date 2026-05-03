import { createTagSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import { NotFoundError } from '@/lib/errors';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import { validate } from '@/middleware/validate';
import { createTag, deleteTag, listTags } from '@/services/tags.service';

const tags = new Hono<{ Variables: OrgMembershipVariables }>()
  .basePath('/tags')
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
tags.post('/', validate('json', createTagSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const data = c.req.valid('json');

  const created = await createTag(organizationId, data);
  return c.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    201
  );
});

// DELETE /tags/:id
tags.delete('/:id', async (c) => {
  const organizationId = c.get('organizationId');
  const id = c.req.param('id');

  const deleted = await deleteTag(id, organizationId);
  if (!deleted) {
    throw new NotFoundError('Tag not found');
  }
  return c.json({ success: true });
});

export default tags;
