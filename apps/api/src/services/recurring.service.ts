import type {
  CreateRecurringRuleInput,
  ListRecurringRulesInput,
  RecurringRuleListResponse,
  RecurringRuleResponse,
  UpdateRecurringRuleInput,
} from '@moneylens/shared';
import { addDays, addMonths, addWeeks, addYears, format } from 'date-fns';
import { and, desc, eq, lt, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recurringRule } from '@/lib/db/schema/recurring';
import { team } from '@/lib/db/schema/team';
import { transaction } from '@/lib/db/schema/transaction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RuleRow = typeof recurringRule.$inferSelect;
type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a positive amount to a signed integer based on transaction type */
function toSignedAmount(amount: number, type: 'income' | 'expense'): number {
  return type === 'income' ? amount : -amount;
}

/** Calculates the next due date given the current date and frequency */
export function calculateNextDueDate(currentDate: string, frequency: Frequency): string {
  const date = new Date(`${currentDate}T00:00:00`);
  let next: Date;
  switch (frequency) {
    case 'daily':
      next = addDays(date, 1);
      break;
    case 'weekly':
      next = addWeeks(date, 1);
      break;
    case 'biweekly':
      next = addWeeks(date, 2);
      break;
    case 'monthly':
      next = addMonths(date, 1);
      break;
    case 'quarterly':
      next = addMonths(date, 3);
      break;
    case 'yearly':
      next = addYears(date, 1);
      break;
  }
  return format(next, 'yyyy-MM-dd');
}

/** Encodes a cursor from (createdAt, id) as base64 */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64');
}

/** Decodes a cursor back to (createdAt, id) */
function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
      createdAt: string;
      id: string;
    };
  } catch {
    return null;
  }
}

/** Serializes a rule row to RecurringRuleResponse */
function serialize(rule: RuleRow): RecurringRuleResponse {
  return {
    id: rule.id,
    organizationId: rule.organizationId,
    accountId: rule.accountId,
    categoryId: rule.categoryId,
    name: rule.name,
    type: rule.type as 'income' | 'expense',
    amount: rule.amount,
    frequency: rule.frequency as Frequency,
    startDate: rule.startDate,
    endDate: rule.endDate,
    nextDueDate: rule.nextDueDate,
    isActive: rule.isActive,
    payee: rule.payee,
    notes: rule.notes,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listRecurringRules(
  organizationId: string,
  input: ListRecurringRulesInput
): Promise<RecurringRuleListResponse> {
  const { accountId, isActive, cursor, limit } = input;

  const conditions = [eq(recurringRule.organizationId, organizationId)];

  if (accountId) conditions.push(eq(recurringRule.accountId, accountId));
  if (isActive !== undefined) conditions.push(eq(recurringRule.isActive, isActive));

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const cursorCondition = or(
        lt(recurringRule.createdAt, new Date(decoded.createdAt)),
        and(
          eq(recurringRule.createdAt, new Date(decoded.createdAt)),
          lt(recurringRule.id, decoded.id)
        )
      );
      if (cursorCondition) conditions.push(cursorCondition);
    }
  }

  const rows = await db
    .select()
    .from(recurringRule)
    .where(and(...conditions))
    .orderBy(desc(recurringRule.createdAt), desc(recurringRule.id))
    .limit(limit + 1);

  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;

  const lastItem = items[items.length - 1];
  const nextCursor = hasNextPage && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  return {
    data: items.map(serialize),
    nextCursor,
  };
}

export async function getRecurringRuleById(
  id: string,
  organizationId: string
): Promise<RecurringRuleResponse | null> {
  const [row] = await db
    .select()
    .from(recurringRule)
    .where(and(eq(recurringRule.id, id), eq(recurringRule.organizationId, organizationId)))
    .limit(1);

  if (!row) return null;
  return serialize(row);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createRecurringRule(
  organizationId: string,
  input: CreateRecurringRuleInput
): Promise<RecurringRuleResponse> {
  // Validate that the account belongs to this org
  const [acct] = await db
    .select({ id: team.id })
    .from(team)
    .where(and(eq(team.id, input.accountId), eq(team.organizationId, organizationId)))
    .limit(1);

  if (!acct) {
    throw Object.assign(new Error('Account not found'), { code: 'NOT_FOUND' });
  }

  const [rule] = await db
    .insert(recurringRule)
    .values({
      organizationId,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      name: input.name,
      type: input.type,
      amount: input.amount,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      nextDueDate: input.startDate,
      isActive: true,
      payee: input.payee ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  if (!rule) throw new Error('Failed to create recurring rule');
  return serialize(rule);
}

export async function updateRecurringRule(
  id: string,
  organizationId: string,
  input: UpdateRecurringRuleInput
): Promise<RecurringRuleResponse | null> {
  const existing = await getRecurringRuleById(id, organizationId);
  if (!existing) return null;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId ?? null;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.frequency !== undefined) updates.frequency = input.frequency;
  if (input.endDate !== undefined) updates.endDate = input.endDate ?? null;
  if (input.payee !== undefined) updates.payee = input.payee ?? null;
  if (input.notes !== undefined) updates.notes = input.notes ?? null;

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  const [updated] = await db
    .update(recurringRule)
    .set(updates)
    .where(and(eq(recurringRule.id, id), eq(recurringRule.organizationId, organizationId)))
    .returning();

  if (!updated) return null;
  return serialize(updated);
}

export async function deleteRecurringRule(
  id: string,
  organizationId: string
): Promise<RecurringRuleResponse | null> {
  const existing = await getRecurringRuleById(id, organizationId);
  if (!existing) return null;

  await db
    .delete(recurringRule)
    .where(and(eq(recurringRule.id, id), eq(recurringRule.organizationId, organizationId)));

  return existing;
}

export async function pauseRecurringRule(
  id: string,
  organizationId: string
): Promise<RecurringRuleResponse | null> {
  const existing = await getRecurringRuleById(id, organizationId);
  if (!existing) return null;

  const [updated] = await db
    .update(recurringRule)
    .set({ isActive: false })
    .where(and(eq(recurringRule.id, id), eq(recurringRule.organizationId, organizationId)))
    .returning();

  if (!updated) return null;
  return serialize(updated);
}

export async function resumeRecurringRule(
  id: string,
  organizationId: string
): Promise<RecurringRuleResponse | null> {
  const existing = await getRecurringRuleById(id, organizationId);
  if (!existing) return null;

  const [updated] = await db
    .update(recurringRule)
    .set({ isActive: true })
    .where(and(eq(recurringRule.id, id), eq(recurringRule.organizationId, organizationId)))
    .returning();

  if (!updated) return null;
  return serialize(updated);
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generates transactions for all active recurring rules that are due on or before `asOfDate`.
 * Handles catch-up: if a rule has fallen behind, generates all missed occurrences.
 * Returns the total number of transactions generated.
 */
export async function generateDueTransactions(asOfDate?: string): Promise<number> {
  const today = asOfDate ?? format(new Date(), 'yyyy-MM-dd');

  // Find all active rules with nextDueDate <= today
  const rules = await db
    .select()
    .from(recurringRule)
    .where(and(eq(recurringRule.isActive, true), lte(recurringRule.nextDueDate, today)));

  let created = 0;

  for (const rule of rules) {
    let currentDueDate = rule.nextDueDate;

    while (currentDueDate <= today) {
      // Create the transaction
      await db.insert(transaction).values({
        organizationId: rule.organizationId,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: toSignedAmount(rule.amount, rule.type as 'income' | 'expense'),
        date: currentDueDate,
        payee: rule.payee,
        notes: rule.notes,
      });

      created++;

      // Calculate next occurrence
      const nextDate = calculateNextDueDate(currentDueDate, rule.frequency as Frequency);

      // Check if rule should be deactivated (endDate exceeded)
      if (rule.endDate && nextDate > rule.endDate) {
        await db
          .update(recurringRule)
          .set({ nextDueDate: nextDate, isActive: false })
          .where(eq(recurringRule.id, rule.id));
        break;
      }

      // Update nextDueDate
      await db
        .update(recurringRule)
        .set({ nextDueDate: nextDate })
        .where(eq(recurringRule.id, rule.id));

      currentDueDate = nextDate;
    }
  }

  return created;
}
