import { Hono } from 'hono';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { createStripePortalSession, getSubscriptionStatus } from '@/services/subscription.service';

const subscriptions = new Hono<{ Variables: AuthVariables }>().basePath('/subscription');

subscriptions.use(requireAuth);

// GET /subscription — current subscription status
subscriptions.get('/', async (c) => {
  const userId = c.get('user')?.id;
  if (!userId) throw new UnauthorizedError('Authentication required');
  const status = await getSubscriptionStatus(userId);

  return c.json({
    isActive: status.isActive,
    entitlement: status.entitlement,
    productId: status.productId ?? null,
    periodType: status.periodType ?? null,
    expiresAt: status.expiresAt?.toISOString() ?? null,
  });
});

// POST /subscription/portal — create Stripe billing portal session
subscriptions.post('/portal', async (c) => {
  const userId = c.get('user')?.id;
  if (!userId) throw new UnauthorizedError('Authentication required');
  const returnUrl = 'moneylens://profile';

  const url = await createStripePortalSession(userId, returnUrl);

  if (!url) throw new NotFoundError('No Stripe subscription found');

  return c.json({ url });
});

export default subscriptions;
