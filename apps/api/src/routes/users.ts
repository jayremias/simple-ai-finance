import { updateUserProfileSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import { UnauthorizedError } from '@/lib/errors';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { getUserProfile, updateUserProfile } from '@/services/users.service';

const users = new Hono<{ Variables: AuthVariables }>();

users.use(requireAuth);

// GET /users/me
users.get('/me', async (c) => {
  const userId = c.get('user')?.id;
  if (!userId) throw new UnauthorizedError('Authentication required');

  const profile = await getUserProfile(userId);
  return c.json(profile);
});

// PATCH /users/me
users.patch('/me', validate('json', updateUserProfileSchema), async (c) => {
  const userId = c.get('user')?.id;
  if (!userId) throw new UnauthorizedError('Authentication required');

  const profile = await updateUserProfile(userId, c.req.valid('json'));
  return c.json(profile);
});

export default users;
