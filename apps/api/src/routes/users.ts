import { updateUserProfileSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { getUserProfile, updateUserProfile } from '@/services/users.service';

const users = new Hono<{ Variables: AuthVariables }>();

users.use(requireAuth);

// GET /users/me
users.get('/me', async (c) => {
  // requireAuth guarantees user is present; defensive check for type safety
  const userId = c.get('user')?.id;
  if (!userId)
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);

  const profile = await getUserProfile(userId);
  return c.json(profile);
});

// PATCH /users/me
users.patch('/me', async (c) => {
  const result = updateUserProfileSchema.safeParse(await c.req.json());

  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: result.error.flatten().fieldErrors,
        },
      },
      400
    );
  }

  const userId = c.get('user')?.id;
  if (!userId)
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);

  const profile = await updateUserProfile(userId, result.data);
  return c.json(profile);
});

export default users;
