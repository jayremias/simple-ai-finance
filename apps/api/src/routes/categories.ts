import { createCategorySchema, updateCategorySchema } from '@moneylens/shared';
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
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories.service';

const categories = new Hono<{ Variables: OrgMembershipVariables }>()
  .basePath('/categories')
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
categories.post('/', validate('json', createCategorySchema), async (c) => {
  const organizationId = c.get('organizationId');
  const data = c.req.valid('json');

  const created = await createCategory(organizationId, data);
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
categories.patch('/:id', validate('json', updateCategorySchema), async (c) => {
  const organizationId = c.get('organizationId');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const updated = await updateCategory(id, organizationId, data);
  if (!updated) {
    throw new NotFoundError('Category not found');
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
    throw new NotFoundError('Category not found');
  }

  return c.json({ success: true });
});

export default categories;
