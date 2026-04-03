import type {
  ExtractReceiptInput,
  ParseTransactionsResponse,
  UploadUrlResponse,
} from '@moneylens/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useGetUploadUrl() {
  return useMutation({
    mutationFn: () => api.post('receipts/upload-url').json<UploadUrlResponse>(),
  });
}

export function useExtractReceipt() {
  return useMutation({
    mutationFn: (input: ExtractReceiptInput) =>
      api.post('receipts/extract', { json: input }).json<ParseTransactionsResponse>(),
  });
}
