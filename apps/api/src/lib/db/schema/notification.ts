import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const notification = pgTable(
  'notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message'),
    data: jsonb('data'),
    link: text('link'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    readAt: timestamp('read_at'),
  },
  (table) => [
    index('notification_userId_idx').on(table.userId),
    index('notification_userId_readAt_idx').on(table.userId, table.readAt),
  ]
);
