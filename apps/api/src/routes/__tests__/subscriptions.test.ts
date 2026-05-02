import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import {
  MONTH_IN_MILISECONDS,
  SECOND_IN_MILISECONDS,
  WEEK_IN_MILISECONDS,
} from '@moneylens/shared';
import { eq } from 'drizzle-orm';
import { app } from '@/index';
import { db } from '@/lib/db';
import { subscription } from '@/lib/db/schema';
import { bearerHeader, createAuthenticatedUser } from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type SubscriptionResponse = {
  isActive: boolean;
  entitlement: string;
  productId: string | null;
  periodType: string | null;
  expiresAt: string | null;
};

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// GET /api/v1/subscription
// ---------------------------------------------------------------------------

describe('GET /api/v1/subscription', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/subscription');
    expect(res.status).toBe(401);
  });

  test('returns free/inactive when no subscription row exists', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/subscription', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as SubscriptionResponse;
    expect(body.isActive).toBe(false);
    expect(body.entitlement).toBe('free');
    expect(body.productId).toBeNull();
    expect(body.expiresAt).toBeNull();
  });

  test('returns active subscription when row exists', async () => {
    const { user, token } = await createAuthenticatedUser();

    await db.insert(subscription).values({
      userId: user.id,
      entitlement: 'premium',
      isActive: true,
      productId: 'moneylens_premium_monthly',
      periodType: 'NORMAL',
      expiresAt: new Date(Date.now() + MONTH_IN_MILISECONDS),
    });

    const res = await app.request('/api/v1/subscription', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as SubscriptionResponse;
    expect(body.isActive).toBe(true);
    expect(body.entitlement).toBe('premium');
    expect(body.productId).toBe('moneylens_premium_monthly');
  });
});

// ---------------------------------------------------------------------------
// POST /webhooks/revenuecat
// ---------------------------------------------------------------------------

describe('POST /webhooks/revenuecat', () => {
  function makeEvent(type: string, userId: string, extra: Record<string, unknown> = {}) {
    return {
      event: {
        type,
        app_user_id: userId,
        product_id: 'moneylens_premium_monthly',
        entitlement_id: 'premium',
        period_type: 'NORMAL',
        expiration_at_ms: Date.now() + MONTH_IN_MILISECONDS,
        ...extra,
      },
      api_version: '1.0',
    };
  }

  test('INITIAL_PURCHASE activates subscription', async () => {
    const { user } = await createAuthenticatedUser();

    const res = await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeEvent('INITIAL_PURCHASE', user.id)),
    });

    expect(res.status).toBe(200);

    const [row] = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    expect(row).toBeDefined();
    expect(row?.isActive).toBe(true);
    expect(row?.entitlement).toBe('premium');
  });

  test('RENEWAL keeps subscription active', async () => {
    const { user } = await createAuthenticatedUser();

    await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeEvent('RENEWAL', user.id)),
    });

    const [row] = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    expect(row?.isActive).toBe(true);
  });

  test('EXPIRATION deactivates subscription', async () => {
    const { user } = await createAuthenticatedUser();

    // First activate
    await db.insert(subscription).values({
      userId: user.id,
      entitlement: 'premium',
      isActive: true,
    });

    await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        makeEvent('EXPIRATION', user.id, { expiration_at_ms: Date.now() - SECOND_IN_MILISECONDS })
      ),
    });

    const [row] = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    expect(row?.isActive).toBe(false);
  });

  test('CANCELLATION keeps access when expiry is in the future', async () => {
    const { user } = await createAuthenticatedUser();

    await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        makeEvent('CANCELLATION', user.id, {
          expiration_at_ms: Date.now() + WEEK_IN_MILISECONDS,
        })
      ),
    });

    const [row] = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    expect(row?.isActive).toBe(true);
  });

  test('CANCELLATION deactivates when expiry is in the past', async () => {
    const { user } = await createAuthenticatedUser();

    await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        makeEvent('CANCELLATION', user.id, {
          expiration_at_ms: Date.now() - SECOND_IN_MILISECONDS,
        })
      ),
    });

    const [row] = await db.select().from(subscription).where(eq(subscription.userId, user.id));

    expect(row?.isActive).toBe(false);
  });

  test('returns 401 when wrong webhook secret is provided', async () => {
    // Temporarily set the secret env var — only validates if secret is set
    const original = process.env.REVENUECAT_WEBHOOK_SECRET;
    process.env.REVENUECAT_WEBHOOK_SECRET = 'correct-secret';

    const res = await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'wrong-secret',
      },
      body: JSON.stringify({
        event: { type: 'INITIAL_PURCHASE', app_user_id: 'user-1' },
        api_version: '1.0',
      }),
    });

    process.env.REVENUECAT_WEBHOOK_SECRET = original;

    expect(res.status).toBe(401);
  });

  test('ignores events with no app_user_id', async () => {
    const res = await app.request('/webhooks/revenuecat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' }, api_version: '1.0' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { received: boolean };
    expect(body.received).toBe(true);
  });
});
