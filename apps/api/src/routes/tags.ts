import { createTagSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { createTag, deleteTag, listTags } from '@/services/tags.service';

const tags = new Hono<{ Variables: AuthVariables }>().basePath('/tags').use(requireAuth);

// GET /tags
tags.get('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }
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
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

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
      400
    );
  }

  try {
    const created = await createTag(organizationId, parsed.data);
    return c.json(
      {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      201
    );
  } catch (err) {
    if (err instanceof Error && (err as { code?: string }).code === 'DUPLICATE_TAG') {
      return c.json({ error: { code: 'DUPLICATE_TAG', message: err.message } }, 409);
    }
    throw err;
  }
});

// DELETE /tags/:id
tags.delete('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  const id = c.req.param('id');
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const deleted = await deleteTag(id, organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  }
  return c.json({ success: true });
});

export default tags;
