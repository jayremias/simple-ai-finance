import { z } from 'zod';

export const accountMemberRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const accountMemberSourceSchema = z.enum(['organization', 'direct']);

export const accountMemberResponseSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: accountMemberRoleSchema,
  source: accountMemberSourceSchema,
  joinedAt: z.string(),
});

export const accountMembersListResponseSchema = z.object({
  members: z.array(accountMemberResponseSchema),
});

export const changeAccessLevelSchema = z
  .object({
    target: z.enum(['workspace', 'account']),
    role: z.enum(['editor', 'viewer']),
    targetAccountId: z.string().uuid().optional(),
  })
  .refine((data) => data.target === 'workspace' || data.targetAccountId !== undefined, {
    message: 'targetAccountId is required when target is "account"',
    path: ['targetAccountId'],
  });

export const updateAccountMemberRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});
