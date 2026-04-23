import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const subscription = pgTable('subscription', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  rcCustomerId: text('rc_customer_id'),
  stripeCustomerId: text('stripe_customer_id'),
  entitlement: text('entitlement').default('free').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  productId: text('product_id'),
  periodType: text('period_type'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
