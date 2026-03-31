import { z } from 'zod';
import { parsedTransactionItemSchema, transactionResponseSchema } from './transaction';

export const importStatementSchema = z.object({
  key: z.string().min(1),
  accountId: z.string().min(1),
});

export const importStatementResponseSchema = z.object({
  // Imported items that already exist in the DB — likely already entered manually
  matched: z.array(parsedTransactionItemSchema),
  // Imported items with no DB counterpart — user should add these
  missing: z.array(parsedTransactionItemSchema),
  // DB transactions in the statement period with no match in the import
  extra: z.array(transactionResponseSchema),
});

export type ImportStatementInput = z.infer<typeof importStatementSchema>;
export type ImportStatementResponse = z.infer<typeof importStatementResponseSchema>;
