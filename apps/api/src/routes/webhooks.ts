import { Hono } from 'hono';
import { upsertSubscription } from '@/services/subscription.service';

const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
]);

const DEACTIVATE_EVENT_TYPES = new Set(['EXPIRATION', 'BILLING_ISSUE']);

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_id?: string;
  period_type?: string;
  expiration_at_ms?: number;
  subscriber_attributes?: Record<string, { value: string }>;
};

type RevenueCatWebhookBody = {
  event: RevenueCatEvent;
  api_version: string;
};

const webhooks = new Hono();

// POST /webhooks/revenuecat
webhooks.post('/webhooks/revenuecat', async (c) => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (secret) {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== secret) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' } }, 401);
    }
  }

  const body = (await c.req.json()) as RevenueCatWebhookBody;
  const event = body.event;

  if (!event?.app_user_id) {
    return c.json({ received: true });
  }

  const userId = event.app_user_id;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const stripeCustomerId = event.subscriber_attributes?.$stripeCustomerId?.value ?? undefined;

  if (ACTIVE_EVENT_TYPES.has(event.type)) {
    await upsertSubscription(userId, {
      entitlement: event.entitlement_id ?? 'premium',
      isActive: true,
      productId: event.product_id,
      periodType: event.period_type,
      expiresAt,
      stripeCustomerId,
    });
  } else if (DEACTIVATE_EVENT_TYPES.has(event.type)) {
    await upsertSubscription(userId, {
      entitlement: event.entitlement_id ?? 'premium',
      isActive: false,
      productId: event.product_id,
      periodType: event.period_type,
      expiresAt,
      stripeCustomerId,
    });
  } else if (event.type === 'CANCELLATION') {
    // Cancelled but may still have access until expiry
    const isStillActive = expiresAt ? expiresAt > new Date() : false;
    await upsertSubscription(userId, {
      entitlement: event.entitlement_id ?? 'premium',
      isActive: isStillActive,
      productId: event.product_id,
      periodType: event.period_type,
      expiresAt,
      stripeCustomerId,
    });
  }

  return c.json({ received: true });
});

export default webhooks;
