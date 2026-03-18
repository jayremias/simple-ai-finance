import cron from 'node-cron';
import { generateDueTransactions } from '@/services/recurring.service';

/**
 * Schedules a daily cron job at 02:00 UTC to generate transactions
 * for all active recurring rules that are due.
 */
export function scheduleRecurringGeneration(): void {
  cron.schedule('0 2 * * *', async () => {
    try {
      const count = await generateDueTransactions();
      if (count > 0) {
        console.log(`[Cron] Generated ${count} recurring transaction(s)`);
      }
    } catch (err) {
      console.error('[Cron] Failed to generate recurring transactions:', err);
    }
  });

  console.log('[Cron] Recurring transaction generation scheduled (daily at 02:00 UTC)');
}
