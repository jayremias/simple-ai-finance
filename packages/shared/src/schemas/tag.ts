import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export const tagResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
