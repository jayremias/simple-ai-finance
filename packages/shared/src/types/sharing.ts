import type { z } from 'zod';
import type {
  accountMemberResponseSchema,
  accountMembersListResponseSchema,
} from '../schemas/sharing';

export type AccountMemberResponse = z.infer<typeof accountMemberResponseSchema>;
export type AccountMembersListResponse = z.infer<typeof accountMembersListResponseSchema>;
