import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema/auth';
import { notification } from '@/lib/db/schema/notification';

export async function listNotifications(userId: string) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(sql`${notification.isRead} ASC`, desc(notification.createdAt));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));

  return result?.value ?? 0;
}

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<
  | { found: true; notification: typeof notification.$inferSelect }
  | { found: false; reason: 'not_found' | 'forbidden' }
> {
  const [existing] = await db
    .select()
    .from(notification)
    .where(eq(notification.id, notificationId))
    .limit(1);

  if (!existing) return { found: false, reason: 'not_found' };
  if (existing.userId !== userId) return { found: false, reason: 'forbidden' };

  if (existing.isRead) return { found: true, notification: existing };

  const [updated] = await db
    .update(notification)
    .set({ isRead: true })
    .where(eq(notification.id, notificationId))
    .returning();

  return { found: true, notification: updated ?? existing };
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await db
    .update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.userId, userId), eq(notification.isRead, false)))
    .returning();

  return result.length;
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  navigateTo?: string | null;
  metadata?: string | null;
}) {
  const [created] = await db
    .insert(notification)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      navigateTo: data.navigateTo ?? null,
      metadata: data.metadata ?? null,
    })
    .returning();

  return created;
}

export async function createNotificationForEmail(data: {
  email: string;
  type: string;
  title: string;
  message: string;
  navigateTo?: string | null;
  metadata?: string | null;
}) {
  const [recipient] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, data.email))
    .limit(1);

  if (!recipient) return null;

  return createNotification({ ...data, userId: recipient.id });
}
