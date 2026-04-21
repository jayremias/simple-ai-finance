import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { createStripePortalSession, getSubscriptionStatus } from '@/services/subscription.service';

const subscriptions = new Hono<{ Variables: AuthVariables }>().basePath('/subscription');

subscriptions.use(requireAuth);

// GET /subscription — current subscription status
subscriptions.get('/', async (c) => {
  const userId = c.get('user')?.id;
  if (!userId)
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
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
  if (!userId)
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  const returnUrl = 'moneylens://profile';

  const url = await createStripePortalSession(userId, returnUrl);

  if (!url) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No Stripe subscription found' } }, 404);
  }

  return c.json({ url });
});

export default subscriptions;
