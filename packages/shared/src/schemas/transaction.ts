import { z } from 'zod';
import { tagResponseSchema } from './tag';

const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

export const createTransactionSchema = z.object({
  accountId: z.string(),
  categoryId: z.string().optional(),
  type: z.enum(TRANSACTION_TYPES),
  // Always a positive integer in cents — service converts to signed
  amount: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  payee: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  tagIds: z.array(z.string()).optional(),
  // Required for type=transfer: the destination account
  toAccountId: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().nullable().optional(),
  amount: z.number().int().positive().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  payee: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const listTransactionsSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const transactionResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  accountId: z.string(),
  categoryId: z.string().nullable(),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().int(),
  date: z.string(),
  payee: z.string().nullable(),
  notes: z.string().nullable(),
  transferId: z.string().nullable(),
  tags: z.array(tagResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const transactionListResponseSchema = z.object({
  data: z.array(transactionResponseSchema),
  nextCursor: z.string().nullable(),
});

// AI parse schemas
export const parsedTransactionItemSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().int().positive(), // positive cents
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payee: z.string().optional(),
  notes: z.string().optional(),
  categoryHint: z.string().optional(), // suggested category name
  confidence: z.number().min(0).max(1),
});

export const parseTransactionsResponseSchema = z.object({
  items: z.array(parsedTransactionItemSchema),
  // 0-1 overall confidence of the source text quality
  sourceConfidence: z.number().min(0).max(1),
});
