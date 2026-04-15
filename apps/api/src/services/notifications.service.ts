import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notification } from '@/lib/db/schema/notification';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  options: { message?: string; data?: Record<string, unknown>; link?: string } = {}
) {
  const [created] = await db
    .insert(notification)
    .values({
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message: options.message ?? null,
      data: options.data ?? null,
      link: options.link ?? null,
    })
    .returning();

  return created;
}

export async function listNotifications(userId: string) {
  const rows = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    status: row.readAt ? 'read' : 'unread',
    title: row.title,
    message: row.message,
    data: row.data as Record<string, unknown> | null,
    link: row.link,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  }));
}

export async function markAsRead(notificationId: string, userId: string) {
  const [updated] = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
    .returning();

  return updated ?? null;
}
