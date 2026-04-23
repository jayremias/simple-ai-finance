import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['read', 'unread']),
  title: z.string(),
  message: z.string().nullable(),
  data: z.record(z.unknown()).nullable(),
  link: z.string().nullable(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});

export const notificationsListResponseSchema = z.object({
  data: z.array(notificationSchema),
});

export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;
