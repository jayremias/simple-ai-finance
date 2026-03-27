import type {
  ExtractReceiptInput,
  ParseTransactionsResponse,
  UploadUrlResponse,
} from '@moneylens/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useGetUploadUrl() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<UploadUrlResponse>('/receipts/upload-url');
      return res.data;
    },
  });
}

export function useExtractReceipt() {
  return useMutation({
    mutationFn: async (input: ExtractReceiptInput) => {
      const res = await api.post<ParseTransactionsResponse>('/receipts/extract', input);
      return res.data;
    },
  });
}
