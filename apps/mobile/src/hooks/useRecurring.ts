import type {
  CreateRecurringRuleInput,
  RecurringRuleListResponse,
  RecurringRuleResponse,
  UpdateRecurringRuleInput,
} from '@moneylens/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const QUERY_KEY = 'recurring';

export function useRecurringRules(params: { accountId?: string; isActive?: boolean } = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params.accountId) query.accountId = params.accountId;
      if (params.isActive !== undefined) query.isActive = String(params.isActive);
      const res = await api.get<RecurringRuleListResponse>('/recurring', { params: query });
      return res.data;
    },
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRecurringRuleInput) => {
      const res = await api.post<RecurringRuleResponse>('/recurring', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRecurringRuleInput }) => {
      const res = await api.patch<RecurringRuleResponse>(`/recurring/${id}`, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recurring/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function usePauseRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<RecurringRuleResponse>(`/recurring/${id}/pause`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useResumeRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<RecurringRuleResponse>(`/recurring/${id}/resume`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
