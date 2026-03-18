import { env } from '@/env';
import { logger } from '@/lib/logger';
import { recurringQueue } from '@/queues/recurring.queue';
import { createRecurringWorker } from '@/workers/recurring.worker';

async function main() {
  logger.info('Starting MoneyLens worker', { env: env.NODE_ENV });

  // Register repeatable job: daily at 02:00 UTC
  await recurringQueue.upsertJobScheduler(
    'daily-recurring-generation',
    { pattern: '0 2 * * *' },
    { name: 'generate-recurring-transactions' }
  );

  logger.info('Registered repeatable job: daily-recurring-generation (02:00 UTC)');

  // Start workers
  const recurringWorker = createRecurringWorker();
  logger.info('Recurring payments worker started');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await recurringWorker.close();
    await recurringQueue.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error('Worker failed to start', { error: String(err) });
  process.exit(1);
});
