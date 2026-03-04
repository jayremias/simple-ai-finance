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
      "user_profile",
      "session",
      "account",
      "verification",
      "member",
      "invitation",
      "organization",
      "user"
    RESTART IDENTITY`
  );
}
