import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { listNotifications, markAsRead } from '@/services/notifications.service';

const notifications = new Hono<{ Variables: AuthVariables }>()
  .basePath('/notifications')
  .use(requireAuth);

// GET /notifications — List all notifications for the authenticated user
notifications.get('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }

  const data = await listNotifications(user.id);
  return c.json({ data });
});

// PATCH /notifications/:id/read — Mark a notification as read
notifications.patch('/:id/read', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }

  const notificationId = c.req.param('id');
  const updated = await markAsRead(notificationId, user.id);

  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } }, 404);
  }

  return c.json({ success: true });
});

export default notifications;
