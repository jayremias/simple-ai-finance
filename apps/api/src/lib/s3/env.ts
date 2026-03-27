import { z } from 'zod';

const envSchema = z.object({
  S3_ENDPOINT: z.string().url().optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  S3_RECEIPT_BUCKET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
