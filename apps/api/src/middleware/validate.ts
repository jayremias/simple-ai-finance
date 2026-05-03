import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodSchema } from 'zod';

/**
 * Wraps `@hono/zod-validator` so failures throw the ZodError and bubble up
 * to the global error handler (see `middleware/error-handler.ts`), which
 * formats it as `{ error: { code: 'VALIDATION_ERROR', ... } }`.
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends ZodSchema>(
  target: Target,
  schema: Schema
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw result.error;
    }
  });
