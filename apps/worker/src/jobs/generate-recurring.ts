import { db } from '@moneylens/api/db';
import { recurringRule, transaction } from '@moneylens/api/db/schema';
import { addDays, addMonths, addWeeks, addYears, format } from 'date-fns';
import { and, eq, lte } from 'drizzle-orm';

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

function toSignedAmount(amount: number, type: 'income' | 'expense'): number {
  return type === 'income' ? amount : -amount;
}

function calculateNextDueDate(currentDate: string, frequency: Frequency): string {
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

/**
 * Generates transactions for all active recurring rules that are due on or before `asOfDate`.
 * Handles catch-up: if a rule has fallen behind, generates all missed occurrences.
 * Returns the total number of transactions generated.
 */
export async function generateDueTransactions(asOfDate?: string): Promise<number> {
  const today = asOfDate ?? format(new Date(), 'yyyy-MM-dd');

  const rules = await db
    .select()
    .from(recurringRule)
    .where(and(eq(recurringRule.isActive, true), lte(recurringRule.nextDueDate, today)));

  let created = 0;

  for (const rule of rules) {
    let currentDueDate = rule.nextDueDate;

    while (currentDueDate <= today) {
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

      const nextDate = calculateNextDueDate(currentDueDate, rule.frequency as Frequency);

      if (rule.endDate && nextDate > rule.endDate) {
        await db
          .update(recurringRule)
          .set({ nextDueDate: nextDate, isActive: false })
          .where(eq(recurringRule.id, rule.id));
        break;
      }

      await db
        .update(recurringRule)
        .set({ nextDueDate: nextDate })
        .where(eq(recurringRule.id, rule.id));

      currentDueDate = nextDate;
    }
  }

  return created;
}
