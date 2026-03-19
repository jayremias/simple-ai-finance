import { type Job, Worker } from 'bullmq';
import { generateDueTransactions } from '@/jobs/generate-recurring';
import { logger } from '@/lib/logger';
import { connection } from '@/lib/redis';
import { RECURRING_QUEUE_NAME } from '@/queues/recurring.queue';

export function createRecurringWorker(): Worker {
  const worker = new Worker(
    RECURRING_QUEUE_NAME,
    async (job: Job) => {
      logger.info('Starting recurring payment generation', { jobId: job.id });
      const count = await generateDueTransactions();
      logger.info('Recurring payment generation complete', { jobId: job.id, created: count });
      return { created: count };
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('Recurring payment job failed', {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Recurring payment job completed', {
      jobId: job.id,
      result: job.returnvalue,
    });
  });

  return worker;
}
