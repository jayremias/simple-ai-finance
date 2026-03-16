import type { z } from 'zod';
import type {
  categoryResponseSchema,
  categoryTreeResponseSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../schemas/category';

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CategoryTreeResponse = z.infer<typeof categoryTreeResponseSchema>;
