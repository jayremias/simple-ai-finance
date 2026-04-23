import { createMiddleware } from 'hono/factory';
import type { AuthVariables } from '@/middleware/auth';
import { getSubscriptionStatus } from '@/services/subscription.service';

export const requireSubscription = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    const status = await getSubscriptionStatus(user.id);

    if (!status.isActive) {
      return c.json(
        { error: { code: 'PAYMENT_REQUIRED', message: 'Premium subscription required' } },
        402
      );
    }

    await next();
  }
);
