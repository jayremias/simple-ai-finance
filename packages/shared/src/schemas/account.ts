import { z } from 'zod';
import { ACCOUNT_STATUSES, ACCOUNT_TYPES, CURRENCIES } from '../constants/account';

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(CURRENCIES),
  initial_balance: z.number().int().default(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  opened_at: z.string().date().optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  currency: z.enum(CURRENCIES).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullish(),
  icon: z.string().max(50).nullish(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  opened_at: z.string().date().nullish(),
});

export const accountResponseSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(CURRENCIES),
  initialBalance: z.number().int(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  status: z.enum(ACCOUNT_STATUSES),
  openedAt: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listAccountsQuerySchema = z.object({
  status: z.enum(ACCOUNT_STATUSES).optional(),
});
