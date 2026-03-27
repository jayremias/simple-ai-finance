import { randomUUID } from 'node:crypto';
import type {
  ImportStatementResponse,
  ParsedTransactionItem,
  TransactionResponse,
} from '@moneylens/shared';
import { and, eq, gte, lte } from 'drizzle-orm';
import { extractText } from '@/lib/ai/ocr';
import { parseTransactionsFromText } from '@/lib/ai/parse';
import { db } from '@/lib/db';
import { tag } from '@/lib/db/schema/tag';
import { transaction, transactionTag } from '@/lib/db/schema/transaction';
import { getObject, getPresignedUploadUrl } from '@/lib/s3';

// ---------------------------------------------------------------------------
// Upload URL
// ---------------------------------------------------------------------------

export async function getStatementUploadUrl(): Promise<{ url: string; key: string }> {
  const key = `statements/${randomUUID()}.pdf`;
  const url = await getPresignedUploadUrl(key);
  return { url, key };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const DATE_TOLERANCE_DAYS = 3;
const PAYEE_SIMILARITY_THRESHOLD = 0.6;

/** Tokenizes a string into lowercase alpha-numeric words for Jaccard similarity */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

/** Jaccard similarity between two token sets: |intersection| / |union| */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter((token) => b.has(token)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/** Absolute difference between two YYYY-MM-DD dates in days */
function dateDiffDays(dateA: string, dateB: string): number {
  const msPerDay = 86_400_000;
  return Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / msPerDay;
}

/** Returns true if a parsed item matches an existing transaction */
function isMatch(
  imported: ParsedTransactionItem,
  existing: { amount: number; date: string; payee: string | null }
): boolean {
  // Amounts must be equal in absolute cents
  if (Math.abs(imported.amount) !== Math.abs(existing.amount)) return false;

  // Date must be within tolerance
  if (dateDiffDays(imported.date, existing.date) > DATE_TOLERANCE_DAYS) return false;

  // If neither has a payee, consider it a match on amount + date
  if (!imported.payee && !existing.payee) return true;

  // If one has a payee and the other doesn't, still match on amount + date
  if (!imported.payee || !existing.payee) return true;

  // Both have payees — require minimum similarity
  const similarity = jaccardSimilarity(tokenize(imported.payee), tokenize(existing.payee));
  return similarity >= PAYEE_SIMILARITY_THRESHOLD;
}

export interface MatchResult {
  matched: ParsedTransactionItem[];
  missing: ParsedTransactionItem[];
  extra: TransactionResponse[];
}

/**
 * Classifies imported items against existing DB transactions.
 * Pure function — exported for unit testing.
 */
export function matchTransactions(
  imported: ParsedTransactionItem[],
  existing: TransactionResponse[]
): MatchResult {
  const matchedImportedIndices = new Set<number>();
  const matchedExistingIndices = new Set<number>();

  for (let importedIndex = 0; importedIndex < imported.length; importedIndex++) {
    const importedItem = imported[importedIndex];
    if (!importedItem) continue;

    for (let existingIndex = 0; existingIndex < existing.length; existingIndex++) {
      if (matchedExistingIndices.has(existingIndex)) continue;
      const existingItem = existing[existingIndex];
      if (!existingItem) continue;

      if (isMatch(importedItem, existingItem)) {
        matchedImportedIndices.add(importedIndex);
        matchedExistingIndices.add(existingIndex);
        break;
      }
    }
  }

  const matched = imported.filter((_, index) => matchedImportedIndices.has(index));
  const missing = imported.filter((_, index) => !matchedImportedIndices.has(index));
  const extra = existing.filter((_, index) => !matchedExistingIndices.has(index));

  return { matched, missing, extra };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function fetchExistingTransactions(
  accountId: string,
  organizationId: string,
  dateFrom: string,
  dateTo: string
): Promise<TransactionResponse[]> {
  const rows = await db
    .select({
      id: transaction.id,
      organizationId: transaction.organizationId,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      payee: transaction.payee,
      notes: transaction.notes,
      transferId: transaction.transferId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.accountId, accountId),
        eq(transaction.organizationId, organizationId),
        gte(transaction.date, dateFrom),
        lte(transaction.date, dateTo)
      )
    );

  // Fetch tags for all transactions
  const ids = rows.map((r) => r.id);
  const tagRows =
    ids.length > 0
      ? await db
          .select({
            transactionId: transactionTag.transactionId,
            id: tag.id,
            name: tag.name,
            organizationId: tag.organizationId,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
          })
          .from(transactionTag)
          .innerJoin(tag, eq(transactionTag.tagId, tag.id))
          .where(and(...ids.map((id) => eq(transactionTag.transactionId, id))))
      : [];

  const tagMap = new Map<string, (typeof tagRows)[number][]>();
  for (const row of tagRows) {
    const existing = tagMap.get(row.transactionId) ?? [];
    existing.push(row);
    tagMap.set(row.transactionId, existing);
  }

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    accountId: row.accountId,
    categoryId: row.categoryId,
    type: row.type as 'income' | 'expense' | 'transfer',
    amount: row.amount,
    date: row.date,
    payee: row.payee,
    notes: row.notes,
    transferId: row.transferId,
    tags: (tagMap.get(row.id) ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      organizationId: t.organizationId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function importStatement(
  key: string,
  accountId: string,
  organizationId: string
): Promise<ImportStatementResponse> {
  const buffer = await getObject(key);
  const { text } = await extractText(buffer, 'application/pdf');
  const { items } = await parseTransactionsFromText(text, {
    today: new Date().toISOString().slice(0, 10),
  });

  if (items.length === 0) {
    return { matched: [], missing: [], extra: [] };
  }

  // Derive date range from parsed items (padded by tolerance days)
  const dates = items.map((item) => item.date).sort();
  const earliest = dates[0] ?? items[0]?.date ?? '';
  const latest = dates[dates.length - 1] ?? items[0]?.date ?? '';

  const paddedFrom = new Date(new Date(earliest).getTime() - DATE_TOLERANCE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const paddedTo = new Date(new Date(latest).getTime() + DATE_TOLERANCE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const existing = await fetchExistingTransactions(accountId, organizationId, paddedFrom, paddedTo);

  return matchTransactions(items, existing);
}
