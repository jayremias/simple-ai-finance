import { createCategorySchema, updateCategorySchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories.service';

const categories = new Hono<{ Variables: AuthVariables }>()
  .basePath('/categories')
  .use(requireAuth);

// GET /categories
categories.get('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;

  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const tree = await listCategories(organizationId);
  return c.json(tree);
});

// POST /categories
categories.post('/', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;

  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const body = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);
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

  const created = await createCategory(organizationId, parsed.data);
  return c.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    201
  );
});

// PATCH /categories/:id
categories.patch('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  const id = c.req.param('id');

  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const body = await c.req.json();
  const parsed = updateCategorySchema.safeParse(body);
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

  const updated = await updateCategory(id, organizationId, parsed.data);
  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
  }

  return c.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /categories/:id
categories.delete('/:id', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  const id = c.req.param('id');

  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const deleted = await deleteCategory(id, organizationId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
  }

  return c.json({ success: true });
});

export default categories;
