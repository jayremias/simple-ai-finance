import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

/**
 * Truncates all application tables in the correct dependency order.
 * Run in beforeEach to ensure a clean state between tests.
 */
export async function truncateAll(): Promise<void> {
  // List child tables before parents to respect FK order — no CASCADE needed
  await db.execute(
    sql`TRUNCATE TABLE
      "recurring_rule",
      "transaction_tag",
      "transaction",
      "tag",
      "user_profile",
      "category",
      "session",
      "account",
      "verification",
      "financial_account",
      "team_member",
      "member",
      "invitation",
      "team",
      "organization",
      "user"
    RESTART IDENTITY`
  );
}
