import type { CreateTagInput } from '@moneylens/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tag } from '@/lib/db/schema/tag';

export async function listTags(organizationId: string) {
  return db.select().from(tag).where(eq(tag.organizationId, organizationId)).orderBy(tag.name);
}

export async function createTag(organizationId: string, data: CreateTagInput) {
  // Check for duplicate within org
  const [existing] = await db
    .select()
    .from(tag)
    .where(and(eq(tag.organizationId, organizationId), eq(tag.name, data.name)))
    .limit(1);

  if (existing) {
    throw Object.assign(new Error('Tag already exists in this organization'), {
      code: 'DUPLICATE_TAG',
    });
  }

  const [created] = await db.insert(tag).values({ organizationId, name: data.name }).returning();

  if (!created) throw new Error('Failed to create tag');
  return created;
}

export async function deleteTag(id: string, organizationId: string) {
  const [deleted] = await db
    .delete(tag)
    .where(and(eq(tag.id, id), eq(tag.organizationId, organizationId)))
    .returning();

  return deleted ?? null;
}
