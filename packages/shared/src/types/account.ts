import type { z } from 'zod';
import type {
  accountResponseSchema,
  createAccountSchema,
  updateAccountSchema,
} from '../schemas/account';

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountResponse = z.infer<typeof accountResponseSchema>;
