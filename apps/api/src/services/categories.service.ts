import type { CreateCategoryInput, UpdateCategoryInput } from '@moneylens/shared';
import { DEFAULT_CATEGORIES } from '@moneylens/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { category } from '@/lib/db/schema/category';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listCategories(organizationId: string) {
  const rows = await db
    .select()
    .from(category)
    .where(eq(category.organizationId, organizationId))
    .orderBy(category.sortOrder);

  // Build tree in memory — parents first, children nested
  const parents = rows.filter((r) => r.parentId === null);
  const childrenMap = new Map<string, typeof rows>();

  for (const row of rows) {
    if (row.parentId !== null) {
      const list = childrenMap.get(row.parentId) ?? [];
      list.push(row);
      childrenMap.set(row.parentId, list);
    }
  }

  return parents.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    children: (childrenMap.get(p.id) ?? []).map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  }));
}

export async function getCategoryById(id: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(category)
    .where(and(eq(category.id, id), eq(category.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createCategory(organizationId: string, data: CreateCategoryInput) {
  // Validate parentId if provided
  if (data.parentId !== undefined) {
    const parent = await getCategoryById(data.parentId, organizationId);

    if (!parent) {
      throw Object.assign(new Error('Parent category not found in this organization'), {
        code: 'INVALID_PARENT',
      });
    }

    // No nesting beyond one level
    if (parent.parentId !== null) {
      throw Object.assign(new Error('Cannot nest categories more than one level deep'), {
        code: 'INVALID_PARENT',
      });
    }
  }

  const [created] = await db
    .insert(category)
    .values({
      organizationId,
      parentId: data.parentId ?? null,
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
      sortOrder: data.sortOrder ?? 0,
      translationKey: null,
      isDefault: false,
    })
    .returning();

  return created!;
}

export async function updateCategory(
  id: string,
  organizationId: string,
  data: UpdateCategoryInput
) {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.icon !== undefined) updates.icon = data.icon ?? null;
  if (data.color !== undefined) updates.color = data.color ?? null;
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

  if (Object.keys(updates).length === 0) {
    return getCategoryById(id, organizationId);
  }

  const [updated] = await db
    .update(category)
    .set(updates)
    .where(and(eq(category.id, id), eq(category.organizationId, organizationId)))
    .returning();

  return updated ?? null;
}

export async function deleteCategory(id: string, organizationId: string) {
  const existing = await getCategoryById(id, organizationId);
  if (!existing) return null;

  // TODO: when transactions are built, check for references here and throw
  // with code 'CATEGORY_IN_USE' if any transactions reference this category.

  // Delete children first, then the parent
  await db
    .delete(category)
    .where(and(eq(category.parentId, id), eq(category.organizationId, organizationId)));

  const [deleted] = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.organizationId, organizationId)))
    .returning();

  return deleted ?? null;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

export async function seedDefaultCategories(organizationId: string) {
  const rows: (typeof category.$inferInsert)[] = [];

  for (const [parentIdx, parent] of DEFAULT_CATEGORIES.entries()) {
    const parentId = crypto.randomUUID();

    rows.push({
      id: parentId,
      organizationId,
      parentId: null,
      name: parent.name,
      translationKey: parent.key,
      icon: parent.icon,
      color: parent.color,
      sortOrder: parentIdx,
      isDefault: true,
    });

    for (const [childIdx, child] of parent.children.entries()) {
      rows.push({
        id: crypto.randomUUID(),
        organizationId,
        parentId,
        name: child.name,
        translationKey: child.key,
        icon: child.icon,
        color: null,
        sortOrder: childIdx,
        isDefault: true,
      });
    }
  }

  await db.insert(category).values(rows);
}
