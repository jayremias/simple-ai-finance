import type {
  CreateTransactionInput,
  TransactionListResponse,
  TransactionResponse,
  UpdateTransactionInput,
} from '@moneylens/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface ListTransactionsParams {
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export function useInfiniteTransactions(params: Omit<ListTransactionsParams, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite', params],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const res = await api.get<TransactionListResponse>('/transactions', {
        params: { ...params, cursor: pageParam, limit: 20 },
      });
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useTransactions(params: ListTransactionsParams = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const res = await api.get<TransactionListResponse>('/transactions', { params });
      return res.data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      const res = await api.post<TransactionResponse>('/transactions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTransactionInput }) => {
      const res = await api.patch<TransactionResponse>(`/transactions/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
