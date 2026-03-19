export interface WeeklyData {
  day: string;
  amount: number;
  isActive?: boolean;
}

export interface AIInsight {
  message: string;
  type: 'info' | 'warning' | 'success';
}

export interface ReceiptDetail {
  imageUri: string;
  category: string;
  amount: number;
  date: string;
  insight: AIInsight;
}

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ReceiptDetail: { receipt: ReceiptDetail };
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
  Categories: undefined;
  Recurring: undefined;
  Profile: undefined;
};
