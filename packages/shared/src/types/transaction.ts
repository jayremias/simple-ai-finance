import type { z } from 'zod';
import type {
  createTransactionSchema,
  listTransactionsSchema,
  parsedTransactionItemSchema,
  parseTransactionsResponseSchema,
  TRANSACTION_TYPES,
  transactionListResponseSchema,
  transactionResponseSchema,
  updateTransactionSchema,
} from '../schemas/transaction';

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
export type TransactionResponse = z.infer<typeof transactionResponseSchema>;
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;
export type ParsedTransactionItem = z.infer<typeof parsedTransactionItemSchema>;
export type ParseTransactionsResponse = z.infer<typeof parseTransactionsResponseSchema>;
