export const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'cash', 'investment'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = ['active', 'archived'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const CURRENCIES = ['BRL', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];
