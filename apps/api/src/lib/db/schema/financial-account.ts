import { date, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { organization } from './organization';
import { team } from './team';

export const financialAccount = pgTable(
  'financial_account',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    currency: text('currency').notNull(),
    initialBalance: integer('initial_balance').notNull().default(0),
    color: text('color'),
    icon: text('icon'),
    status: text('status').notNull().default('active'),
    openedAt: date('opened_at'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('financial_account_teamId_uidx').on(table.teamId),
    index('financial_account_orgId_idx').on(table.organizationId),
    index('financial_account_orgId_status_idx').on(table.organizationId, table.status),
  ]
);
