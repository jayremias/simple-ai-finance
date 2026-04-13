import { z } from 'zod';

export const SHARING_ROLES = ['viewer', 'editor'] as const;

export const inviteToAccountSchema = z.object({
  accountId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(SHARING_ROLES),
});
