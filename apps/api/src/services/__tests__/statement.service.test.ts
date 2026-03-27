import { describe, expect, test } from 'bun:test';
import type { ParsedTransactionItem, TransactionResponse } from '@moneylens/shared';
import { matchTransactions } from '../statement.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImported(overrides: Partial<ParsedTransactionItem> = {}): ParsedTransactionItem {
  return {
    type: 'expense',
    amount: 1250,
    date: '2026-03-15',
    payee: 'Starbucks',
    confidence: 0.95,
    ...overrides,
  };
}

function makeExisting(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id: 'tx-1',
    organizationId: 'org-1',
    accountId: 'acc-1',
    categoryId: null,
    type: 'expense',
    amount: -1250,
    date: '2026-03-15',
    payee: 'Starbucks',
    notes: null,
    transferId: null,
    tags: [],
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Exact matches
// ---------------------------------------------------------------------------

describe('matchTransactions — exact match', () => {
  test('matches same amount, date, and payee', () => {
    const result = matchTransactions([makeImported()], [makeExisting()]);
    expect(result.matched).toHaveLength(1);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });

  test('is case-insensitive on payee', () => {
    const result = matchTransactions(
      [makeImported({ payee: 'STARBUCKS' })],
      [makeExisting({ payee: 'starbucks' })]
    );
    expect(result.matched).toHaveLength(1);
  });

  test('matches when neither has a payee', () => {
    const result = matchTransactions(
      [makeImported({ payee: undefined })],
      [makeExisting({ payee: null })]
    );
    expect(result.matched).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Fuzzy matches
// ---------------------------------------------------------------------------

describe('matchTransactions — fuzzy match', () => {
  test('matches within date tolerance (±3 days)', () => {
    const result = matchTransactions(
      [makeImported({ date: '2026-03-15' })],
      [makeExisting({ date: '2026-03-17' })]
    );
    expect(result.matched).toHaveLength(1);
  });

  test('does not match beyond date tolerance', () => {
    const result = matchTransactions(
      [makeImported({ date: '2026-03-15' })],
      [makeExisting({ date: '2026-03-20' })]
    );
    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(1);
    expect(result.extra).toHaveLength(1);
  });

  test('matches with similar payee names', () => {
    const result = matchTransactions(
      [makeImported({ payee: 'Starbucks Coffee' })],
      [makeExisting({ payee: 'Starbucks Coffee Shop' })]
    );
    expect(result.matched).toHaveLength(1);
  });

  test('does not match with very different payees', () => {
    const result = matchTransactions(
      [makeImported({ payee: 'Starbucks' })],
      [makeExisting({ payee: 'Amazon Prime Video' })]
    );
    expect(result.matched).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Amount mismatch
// ---------------------------------------------------------------------------

describe('matchTransactions — amount mismatch', () => {
  test('does not match different amounts', () => {
    const result = matchTransactions(
      [makeImported({ amount: 1250 })],
      [makeExisting({ amount: -999 })]
    );
    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(1);
    expect(result.extra).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Multiple items
// ---------------------------------------------------------------------------

describe('matchTransactions — multiple items', () => {
  test('correctly splits matched, missing, and extra', () => {
    const imported = [
      makeImported({ amount: 1250, payee: 'Starbucks', date: '2026-03-15' }),
      makeImported({ amount: 5000, payee: 'Uber', date: '2026-03-16' }),
      makeImported({ amount: 9900, payee: 'Netflix', date: '2026-03-17' }),
    ];
    const existing = [
      makeExisting({ id: 'tx-1', amount: -1250, payee: 'Starbucks', date: '2026-03-15' }),
      makeExisting({ id: 'tx-2', amount: -7500, payee: 'Gym', date: '2026-03-14' }),
    ];

    const result = matchTransactions(imported, existing);

    // Starbucks matches
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.payee).toBe('Starbucks');

    // Uber and Netflix are missing from DB
    expect(result.missing).toHaveLength(2);

    // Gym has no match in the import
    expect(result.extra).toHaveLength(1);
    expect(result.extra[0]?.payee).toBe('Gym');
  });

  test('each existing transaction is only matched once', () => {
    const imported = [
      makeImported({ amount: 1250, payee: 'Starbucks' }),
      makeImported({ amount: 1250, payee: 'Starbucks' }),
    ];
    const existing = [makeExisting({ amount: -1250, payee: 'Starbucks' })];

    const result = matchTransactions(imported, existing);

    expect(result.matched).toHaveLength(1);
    expect(result.missing).toHaveLength(1);
    expect(result.extra).toHaveLength(0);
  });

  test('returns all as missing when no existing transactions', () => {
    const result = matchTransactions([makeImported(), makeImported()], []);
    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(2);
    expect(result.extra).toHaveLength(0);
  });

  test('returns all as extra when no imported items', () => {
    const result = matchTransactions([], [makeExisting(), makeExisting()]);
    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(2);
  });
});
