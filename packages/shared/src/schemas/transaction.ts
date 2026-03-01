import { z } from 'zod';
import { TRANSACTION_TYPES, CURRENCIES } from '../constants';

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(TRANSACTION_TYPES),
  /** Amount in cents */
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.enum(CURRENCIES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  payee: z.string().min(1, 'Payee is required'),
  categoryId: z.string().uuid(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPending: z.boolean().default(false),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const transactionFilterSchema = z.object({
  accountId: z.string().uuid().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
