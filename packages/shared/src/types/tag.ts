import type { z } from 'zod';
import type { createTagSchema, tagResponseSchema } from '../schemas/tag';

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
