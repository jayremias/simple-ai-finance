import { z } from 'zod';

export const SHARING_ROLES = ['viewer', 'editor'] as const;
export const ACCOUNT_ROLES = ['owner', 'editor', 'viewer'] as const;

export const inviteToAccountSchema = z.object({
  accountId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(SHARING_ROLES),
});

export const revokeAccessSchema = z.object({
  userId: z.string().min(1),
});

export const accountMemberResponseSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(ACCOUNT_ROLES),
});

export const accountMembersListResponseSchema = z.object({
  data: z.array(accountMemberResponseSchema),
});

export type InviteToAccountInput = z.infer<typeof inviteToAccountSchema>;
export type RevokeAccessInput = z.infer<typeof revokeAccessSchema>;
export type AccountMemberResponse = z.infer<typeof accountMemberResponseSchema>;
export type AccountMembersListResponse = z.infer<typeof accountMembersListResponseSchema>;
