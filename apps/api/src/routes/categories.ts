import { createCategorySchema, updateCategorySchema } from '@moneylens/shared';
import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { requireAuth } from '@/middleware/auth';
import {
  type OrgMembershipVariables,
  requireActiveOrg,
  requireOrgMembership,
} from '@/middleware/organization';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories.service';

const categories = new Hono<{ Variables: OrgMembershipVariables }>()
  .use(requireAuth)
  .use(requireActiveOrg)
  .use(requireOrgMembership());

// GET /categories
categories.get('/', async (c) => {
  const organizationId = c.get('organizationId');
  const tree = await listCategories(organizationId);
  return c.json(tree);
});

// POST /categories
categories.post('/', async (c) => {
  const organizationId = c.get('organizationId');

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
      StatusCodes.BAD_REQUEST
    );
  }

  const created = await createCategory(organizationId, parsed.data);
  return c.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    StatusCodes.CREATED
  );
});

// PATCH /categories/:id
categories.patch('/:id', async (c) => {
  const organizationId = c.get('organizationId');
  const id = c.req.param('id');

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
      StatusCodes.BAD_REQUEST
    );
  }

  const updated = await updateCategory(id, organizationId, parsed.data);
  if (!updated) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Category not found' } },
      StatusCodes.NOT_FOUND
    );
  }

  return c.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /categories/:id
categories.delete('/:id', async (c) => {
  const organizationId = c.get('organizationId');
  const id = c.req.param('id');

  const deleted = await deleteCategory(id, organizationId);
  if (!deleted) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Category not found' } },
      StatusCodes.NOT_FOUND
    );
  }

  return c.json({ success: true });
});

export default categories;
