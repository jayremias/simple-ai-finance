import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  icon: z.string().max(50).nullish(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullish(),
  sortOrder: z.number().int().optional(),
});

export const categoryResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  translationKey: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number().int(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const categoryTreeResponseSchema = categoryResponseSchema.extend({
  children: z.array(categoryResponseSchema),
});
