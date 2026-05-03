import { Hono } from 'hono';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { listNotifications, markAsRead } from '@/services/notifications.service';

const notifications = new Hono<{ Variables: AuthVariables }>()
  .basePath('/notifications')
  .use(requireAuth);

// GET /notifications — List all notifications for the authenticated user
notifications.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw new UnauthorizedError('Not authenticated');

  const data = await listNotifications(user.id);
  return c.json({ data });
});

// PATCH /notifications/:id/read — Mark a notification as read
notifications.patch('/:id/read', async (c) => {
  const user = c.get('user');
  if (!user) throw new UnauthorizedError('Not authenticated');

  const updated = await markAsRead(c.req.param('id'), user.id);
  if (!updated) throw new NotFoundError('Notification not found');

  return c.json({ success: true });
});

export default notifications;
