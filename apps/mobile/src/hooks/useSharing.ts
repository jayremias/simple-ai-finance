import type { AccountMemberResponse, InviteToAccountInput } from '@moneylens/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useAccountMembers(accountId: string) {
  return useQuery({
    queryKey: ['sharing', 'members', accountId],
    queryFn: () =>
      api.get(`sharing/${accountId}/members`).json<{ data: AccountMemberResponse[] }>(),
  });
}

export function useInviteToAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteToAccountInput) =>
      api.post('sharing/invite', { json: data }).json<unknown>(),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sharing', 'members', variables.accountId] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post(`sharing/invitations/${invitationId}/accept`).json<{ success: boolean }>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRevokeAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, userId }: { accountId: string; userId: string }) =>
      api.delete(`sharing/${accountId}`, { json: { userId } }).json<{ success: boolean }>(),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sharing', 'members', variables.accountId] });
    },
  });
}
