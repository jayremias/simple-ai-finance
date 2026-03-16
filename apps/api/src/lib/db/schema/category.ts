import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { organization } from './organization';

export const category = pgTable(
  'category',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Self-referencing parent — no FK constraint; enforced at app level
    parentId: text('parent_id'),
    name: text('name').notNull(),
    // Stable key for i18n lookups (e.g. "food_dining"). Null for user-created categories.
    translationKey: text('translation_key'),
    icon: text('icon'),
    color: text('color'),
    sortOrder: integer('sort_order').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('category_orgId_idx').on(table.organizationId),
    index('category_parentId_idx').on(table.parentId),
  ]
);
