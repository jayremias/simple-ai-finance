export const CURRENCIES = ['BRL', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'cash', 'investment'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const DEFAULT_CATEGORIES = [
  'Housing',
  'Food & Dining',
  'Transportation',
  'Health & Fitness',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Utilities',
  'Education',
  'Travel',
  'Personal Care',
  'Gifts & Donations',
  'Taxes & Fees',
  'Income',
] as const;
