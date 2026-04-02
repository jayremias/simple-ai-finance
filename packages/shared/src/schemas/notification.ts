import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'invitation_received',
  'invitation_accepted',
  'system',
]);

export const notificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  navigateTo: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationListResponseSchema = z.array(notificationResponseSchema);

export const unreadCountResponseSchema = z.object({
  count: z.number(),
});
