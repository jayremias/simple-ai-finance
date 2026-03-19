import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { category } from './category';
import { organization } from './organization';
import { team } from './team';

export const recurringRule = pgTable(
  'recurring_rule',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // accountId references team.id (Better Auth team = financial account)
    accountId: text('account_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => category.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    type: text('type').$type<'income' | 'expense'>().notNull(),
    // Positive integer in cents — service converts to signed on generation
    amount: integer('amount').notNull(),
    frequency: text('frequency')
      .$type<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'>()
      .notNull(),
    startDate: text('start_date').notNull(), // YYYY-MM-DD
    endDate: text('end_date'), // YYYY-MM-DD, null = indefinite
    nextDueDate: text('next_due_date').notNull(), // YYYY-MM-DD — next date to generate
    isActive: boolean('is_active').notNull().default(true),
    payee: text('payee'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('recurring_rule_orgId_idx').on(table.organizationId),
    index('recurring_rule_accountId_idx').on(table.accountId),
    index('recurring_rule_nextDueDate_idx').on(table.nextDueDate),
    index('recurring_rule_isActive_idx').on(table.isActive),
    index('recurring_rule_active_due_idx').on(table.isActive, table.nextDueDate),
  ]
);
