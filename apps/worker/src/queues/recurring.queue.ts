import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';

export const RECURRING_QUEUE_NAME = 'recurring-payments';

export const recurringQueue = new Queue(RECURRING_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});
