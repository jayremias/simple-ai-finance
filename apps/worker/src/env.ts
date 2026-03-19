import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6380'),
  DATABASE_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
