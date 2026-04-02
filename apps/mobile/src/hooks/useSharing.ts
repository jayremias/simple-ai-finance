import type { AccountMembersListResponse } from '@moneylens/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { authApi } from '@/services/authApi';

// ---------------------------------------------------------------------------
// Custom endpoints — account members
// ---------------------------------------------------------------------------

export function useAccountMembers(accountId: string | undefined) {
  return useQuery({
    queryKey: ['account-members', accountId],
    queryFn: async () => {
      const response = await api.get<AccountMembersListResponse>(`/accounts/${accountId}/members`);
      return response.data.members;
    },
    enabled: !!accountId,
  });
}

export function useRemoveAccountMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, userId }: { accountId: string; userId: string }) => {
      await api.delete(`/accounts/${accountId}/members/${userId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account-members', variables.accountId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Better Auth endpoints — invitations
// ---------------------------------------------------------------------------

interface InviteToAccountInput {
  email: string;
  role: string;
  teamId: string;
  organizationId?: string;
}

export function useInviteToAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteToAccountInput) => {
      const response = await authApi.post('/organization/invite-member', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Better Auth endpoints — workspace members
// ---------------------------------------------------------------------------

interface WorkspaceMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ['workspace-members'],
    queryFn: async () => {
      const response = await authApi.get<WorkspaceMember[] | { members: WorkspaceMember[] }>(
        '/organization/list-members'
      );
      const data = response.data;
      // BA may return { members: [...] } or a raw array
      return Array.isArray(data) ? data : data.members;
    },
  });
}

interface InviteToWorkspaceInput {
  email: string;
  role: string;
}

export function useInviteToWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteToWorkspaceInput) => {
      const response = await authApi.post('/organization/invite-member', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
    },
  });
}

export function useUpdateWorkspaceMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await authApi.post('/organization/update-member-role', {
        memberIdOrEmail: memberId,
        role,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['account-members'] });
    },
  });
}

export function useChangeAccessLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      accountId: string;
      userId: string;
      target: 'workspace' | 'account';
      role: string;
      targetAccountId?: string;
    }) => {
      await api.patch(`/accounts/${data.accountId}/members/${data.userId}/access`, {
        target: data.target,
        role: data.role,
        targetAccountId: data.targetAccountId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['account-members'] });
    },
  });
}

export function useUpdateAccountMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { accountId: string; userId: string; role: string }) => {
      await api.patch(`/accounts/${data.accountId}/members/${data.userId}/role`, {
        role: data.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-members'] });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await authApi.post('/organization/remove-member', {
        memberIdOrEmail: memberId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['account-members'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Better Auth endpoints — invitations
// ---------------------------------------------------------------------------

export function useWorkspaceInvitations() {
  return useQuery({
    queryKey: ['workspace-invitations'],
    queryFn: async () => {
      const response = await authApi.get<Invitation[] | { invitations: Invitation[] }>(
        '/organization/list-invitations'
      );
      const data = response.data;
      return Array.isArray(data) ? data : data.invitations;
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await authApi.post('/organization/cancel-invitation', { invitationId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations'] });
    },
  });
}

interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string | null;
  status: string;
  teamId: string | null;
  expiresAt: string;
  inviterId: string;
}

export function useMyInvitations() {
  return useQuery({
    queryKey: ['my-invitations'],
    queryFn: async () => {
      const response = await authApi.get<Invitation[] | { invitations: Invitation[] }>(
        '/organization/list-user-invitations'
      );
      const data = response.data;
      return Array.isArray(data) ? data : data.invitations;
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await authApi.post('/organization/accept-invitation', { invitationId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-members'] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await authApi.post('/organization/reject-invitation', { invitationId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
    },
  });
}
