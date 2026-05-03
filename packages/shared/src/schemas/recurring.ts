import { z } from 'zod';

export const RECURRING_TYPES = ['income', 'expense'] as const;
export const FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;
export type RecurringType = (typeof RECURRING_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];

export const createRecurringRuleSchema = z.object({
  accountId: z.string(),
  categoryId: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  type: z.enum(RECURRING_TYPES),
  // Always a positive integer in cents — service converts to signed on generation
  amount: z.number().int().positive(),
  frequency: z.enum(FREQUENCIES),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  payee: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const updateRecurringRuleSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().nullable().optional(),
  amount: z.number().int().positive().optional(),
  frequency: z.enum(FREQUENCIES).optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  payee: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const listRecurringRulesSchema = z.object({
  accountId: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const recurringRuleResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  accountId: z.string(),
  categoryId: z.string().nullable(),
  name: z.string(),
  type: z.enum(RECURRING_TYPES),
  amount: z.number().int(),
  frequency: z.enum(FREQUENCIES),
  startDate: z.string(),
  endDate: z.string().nullable(),
  nextDueDate: z.string(),
  isActive: z.boolean(),
  payee: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurringRuleListResponseSchema = z.object({
  data: z.array(recurringRuleResponseSchema),
  nextCursor: z.string().nullable(),
});
