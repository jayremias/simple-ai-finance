import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { createStripePortalSession, getSubscriptionStatus } from '@/services/subscription.service';

const subscriptions = new Hono<{ Variables: AuthVariables }>().basePath('/subscription');

subscriptions.use(requireAuth);

// GET /subscription — current subscription status
subscriptions.get('/', async (c) => {
  const userId = c.get('user')?.id;
  if (!userId)
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      StatusCodes.UNAUTHORIZED
    );
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
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      StatusCodes.UNAUTHORIZED
    );
  const returnUrl = 'moneylens://profile';

  const url = await createStripePortalSession(userId, returnUrl);

  if (!url) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'No Stripe subscription found' } },
      StatusCodes.NOT_FOUND
    );
  }

  return c.json({ url });
});

export default subscriptions;
