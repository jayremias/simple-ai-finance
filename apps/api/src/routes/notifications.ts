import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import {
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
} from '@/services/notification.service';

const notifications = new Hono<{ Variables: AuthVariables }>()
  .basePath('/notifications')
  .use(requireAuth);

// GET /notifications — List user's notifications
notifications.get('/', async (context) => {
  const user = context.get('user')!;
  const result = await listNotifications(user.id);
  return context.json({ notifications: result });
});

// GET /notifications/unread-count — Badge count
notifications.get('/unread-count', async (context) => {
  const user = context.get('user')!;
  const unreadCount = await getUnreadCount(user.id);
  return context.json({ count: unreadCount });
});

// PATCH /notifications/:id/read — Mark single as read
notifications.patch('/:id/read', async (context) => {
  const user = context.get('user')!;
  const notificationId = context.req.param('id');

  const result = await markAsRead(notificationId, user.id);

  if (!result.found) {
    const status = result.reason === 'forbidden' ? 403 : 404;
    const code = result.reason === 'forbidden' ? 'FORBIDDEN' : 'NOT_FOUND';
    const message =
      result.reason === 'forbidden' ? 'Cannot access this notification' : 'Notification not found';
    return context.json({ error: { code, message } }, status);
  }

  return context.json(result.notification);
});

// PATCH /notifications/read-all — Mark all as read
notifications.patch('/read-all', async (context) => {
  const user = context.get('user')!;
  const markedCount = await markAllAsRead(user.id);
  return context.json({ count: markedCount });
});

export default notifications;
