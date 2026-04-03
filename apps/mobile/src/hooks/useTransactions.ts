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

function toSearchParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) result[key] = String(value);
  }
  return result;
}

export function useInfiniteTransactions(params: Omit<ListTransactionsParams, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite', params],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api
        .get('transactions', {
          searchParams: toSearchParams({ ...params, limit: 20, cursor: pageParam }),
        })
        .json<TransactionListResponse>(),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useTransactions(params: ListTransactionsParams = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () =>
      api
        .get('transactions', { searchParams: toSearchParams(params) })
        .json<TransactionListResponse>(),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      api.post('transactions', { json: data }).json<TransactionResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      api.patch(`transactions/${id}`, { json: data }).json<TransactionResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function usePayees(query: string) {
  return useQuery({
    queryKey: ['transaction-payees', query],
    queryFn: () =>
      api
        .get('transactions/payees', { searchParams: query ? { q: query } : {} })
        .json<{ data: string[] }>()
        .then((res) => res.data),
    enabled: query.length > 0,
  });
}
