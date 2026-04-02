import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const notification = pgTable(
  'notification',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    navigateTo: text('navigate_to'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('notification_userId_idx').on(table.userId),
    index('notification_userId_isRead_idx').on(table.userId, table.isRead),
  ]
);
