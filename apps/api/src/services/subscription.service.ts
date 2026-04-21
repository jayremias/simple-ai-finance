import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscription } from '@/lib/db/schema';
import { stripe } from '@/lib/stripe';

export type SubscriptionStatus = {
  isActive: boolean;
  entitlement: string;
  productId: string | null;
  periodType: string | null;
  expiresAt: Date | null;
};

export type UpsertSubscriptionInput = {
  rcCustomerId?: string;
  stripeCustomerId?: string;
  entitlement: string;
  isActive: boolean;
  productId?: string | null;
  periodType?: string | null;
  expiresAt?: Date | null;
};

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const [row] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1);

  if (!row) {
    return {
      isActive: false,
      entitlement: 'free',
      productId: null,
      periodType: null,
      expiresAt: null,
    };
  }

  return {
    isActive: row.isActive,
    entitlement: row.entitlement,
    productId: row.productId,
    periodType: row.periodType,
    expiresAt: row.expiresAt,
  };
}

export async function upsertSubscription(
  userId: string,
  data: UpsertSubscriptionInput
): Promise<void> {
  await db
    .insert(subscription)
    .values({
      userId,
      rcCustomerId: data.rcCustomerId,
      stripeCustomerId: data.stripeCustomerId,
      entitlement: data.entitlement,
      isActive: data.isActive,
      productId: data.productId,
      periodType: data.periodType,
      expiresAt: data.expiresAt,
    })
    .onConflictDoUpdate({
      target: subscription.userId,
      set: {
        rcCustomerId: data.rcCustomerId,
        stripeCustomerId: data.stripeCustomerId,
        entitlement: data.entitlement,
        isActive: data.isActive,
        productId: data.productId,
        periodType: data.periodType,
        expiresAt: data.expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function createStripePortalSession(
  userId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) return null;

  const [row] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1);

  if (!row?.stripeCustomerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
