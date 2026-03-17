import { index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { category } from './category';
import { organization } from './organization';
import { tag } from './tag';
import { team } from './team';

export const transaction = pgTable(
  'transaction',
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
    type: text('type').$type<'income' | 'expense' | 'transfer'>().notNull(),
    // Signed integer in cents: positive = inflow (income/transfer-in), negative = outflow (expense/transfer-out)
    // Requests always send positive amounts; service converts based on type
    amount: integer('amount').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    payee: text('payee'),
    notes: text('notes'),
    // Links two transfer transactions (outflow + inflow) — null for non-transfers
    transferId: text('transfer_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('transaction_orgId_idx').on(table.organizationId),
    index('transaction_accountId_idx').on(table.accountId),
    index('transaction_categoryId_idx').on(table.categoryId),
    index('transaction_date_idx').on(table.date),
    index('transaction_transferId_idx').on(table.transferId),
    // Cursor pagination uses (date DESC, id DESC)
    index('transaction_date_id_idx').on(table.date, table.id),
  ]
);

export const transactionTag = pgTable(
  'transaction_tag',
  {
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transaction.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.transactionId, table.tagId] })]
);
