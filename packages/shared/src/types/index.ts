import type { Currency, AccountType, TransactionType } from '../constants';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  defaultCurrency: Currency;
  tier: 'free' | 'premium';
  createdAt: string;
}

export interface FinancialAccount {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  /** Balance in cents */
  balanceCents: number;
  color?: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  /** Amount in cents — always positive; type determines direction */
  amountCents: number;
  currency: Currency;
  date: string;
  payee: string;
  categoryId: string;
  notes?: string;
  tags: string[];
  isPending: boolean;
  recurringRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
}

/** API error envelope */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Cursor-based pagination */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
