import { z } from 'zod';

export const subscriptionResponseSchema = z.object({
  isActive: z.boolean(),
  entitlement: z.string(),
  productId: z.string().nullable(),
  periodType: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

export const stripePortalResponseSchema = z.object({
  url: z.string(),
});

export type StripePortalResponse = z.infer<typeof stripePortalResponseSchema>;
