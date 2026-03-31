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
    queryFn: () => {
      const searchParams: Record<string, string> = {};
      if (params.accountId) searchParams.accountId = params.accountId;
      if (params.isActive !== undefined) searchParams.isActive = String(params.isActive);
      return api.get('recurring', { searchParams }).json<RecurringRuleListResponse>();
    },
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecurringRuleInput) =>
      api.post('recurring', { json: data }).json<RecurringRuleResponse>(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringRuleInput }) =>
      api.patch(`recurring/${id}`, { json: data }).json<RecurringRuleResponse>(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`recurring/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function usePauseRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`recurring/${id}/pause`).json<RecurringRuleResponse>(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useResumeRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`recurring/${id}/resume`).json<RecurringRuleResponse>(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
