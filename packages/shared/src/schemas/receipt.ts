import { z } from 'zod';

export const uploadUrlResponseSchema = z.object({
  url: z.string().url(),
  key: z.string(),
});

export const extractReceiptSchema = z.object({
  key: z.string().min(1),
  accountId: z.string().optional(),
});

export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type ExtractReceiptInput = z.infer<typeof extractReceiptSchema>;
