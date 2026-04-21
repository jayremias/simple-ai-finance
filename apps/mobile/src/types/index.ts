import type { ParsedTransactionItem } from '@moneylens/shared';

export interface WeeklyData {
  day: string;
  amount: number;
  isActive?: boolean;
}

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Paywall: undefined;
  ReceiptReview: { items: ParsedTransactionItem[]; sourceConfidence: number };
  WeeklyAnalysis: undefined;
  TransactionList:
    | {
        accountId?: string;
        type?: 'income' | 'expense' | 'transfer';
      }
    | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Accounts: undefined;
  Scan: undefined;
  Categories: undefined;
  Recurring: undefined;
  Profile: undefined;
};
