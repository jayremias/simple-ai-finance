import type {
  CreateTransactionInput,
  ListTransactionsInput,
  TransactionResponse,
  TransactionType,
  UpdateTransactionInput,
} from '@moneylens/shared';
import { and, desc, eq, gte, ilike, inArray, isNotNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tag } from '@/lib/db/schema/tag';
import { team } from '@/lib/db/schema/team';
import { transaction, transactionTag } from '@/lib/db/schema/transaction';
import { DatabaseError, ForbiddenError, InvalidInputError, NotFoundError } from '@/lib/errors';
import { decodeCursor, encodeCursor } from '@/lib/pagination/cursor';
import { toSignedAmount } from '@/lib/transactions/signed-amount';
import { resolveUserAccountAccess } from '@/services/accounts.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TransactionRow = typeof transaction.$inferSelect;
type TagRow = typeof tag.$inferSelect;

interface TransactionWithTags extends TransactionRow {
  tags: TagRow[];
}

type TxCursor = { date: string; id: string };

/** Fetches tags for a list of transaction ids */
async function fetchTagsForTransactions(txIds: string[]): Promise<Map<string, TagRow[]>> {
  if (txIds.length === 0) return new Map();

  const rows = await db
    .select({ transactionId: transactionTag.transactionId, tag })
    .from(transactionTag)
    .innerJoin(tag, eq(transactionTag.tagId, tag.id))
    .where(inArray(transactionTag.transactionId, txIds));

  const map = new Map<string, TagRow[]>();
  for (const row of rows) {
    const list = map.get(row.transactionId) ?? [];
    list.push(row.tag);
    map.set(row.transactionId, list);
  }
  return map;
}

/** Serializes a transaction row + tags to TransactionResponse */
function serialize(tx: TransactionWithTags): TransactionResponse {
  return {
    id: tx.id,
    organizationId: tx.organizationId,
    accountId: tx.accountId,
    categoryId: tx.categoryId,
    type: tx.type as TransactionType,
    amount: tx.amount,
    date: tx.date,
    payee: tx.payee,
    notes: tx.notes,
    transferId: tx.transferId,
    tags: tx.tags.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      name: t.name,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listTransactions(organizationId: string, input: ListTransactionsInput) {
  const { accountId, categoryId, type, dateFrom, dateTo, cursor, limit } = input;

  const conditions = [eq(transaction.organizationId, organizationId)];

  if (accountId) conditions.push(eq(transaction.accountId, accountId));
  if (categoryId) conditions.push(eq(transaction.categoryId, categoryId));
  if (type) conditions.push(eq(transaction.type, type));
  if (dateFrom) conditions.push(gte(transaction.date, dateFrom));
  if (dateTo) conditions.push(lte(transaction.date, dateTo));

  // Cursor: fetch items older than (date, id)
  if (cursor) {
    const decoded = decodeCursor<TxCursor>(cursor);
    if (decoded) {
      const cursorCondition = or(
        lt(transaction.date, decoded.date),
        and(eq(transaction.date, decoded.date), lt(transaction.id, decoded.id))
      );
      if (cursorCondition) conditions.push(cursorCondition);
    }
  }

  const rows = await db
    .select()
    .from(transaction)
    .where(and(...conditions))
    .orderBy(desc(transaction.date), desc(transaction.createdAt))
    .limit(limit + 1); // fetch one extra to detect next page

  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;

  const tagMap = await fetchTagsForTransactions(items.map((r) => r.id));

  const data = items.map((r) => serialize({ ...r, tags: tagMap.get(r.id) ?? [] }));

  const lastItem = items[items.length - 1];
  const nextCursor =
    hasNextPage && lastItem
      ? encodeCursor<TxCursor>({ date: lastItem.date, id: lastItem.id })
      : null;

  return { data, nextCursor };
}

export async function getAccountIdForTransaction(transactionId: string): Promise<string | null> {
  const [row] = await db
    .select({ accountId: transaction.accountId })
    .from(transaction)
    .where(eq(transaction.id, transactionId))
    .limit(1);
  return row?.accountId ?? null;
}

export async function getTransactionById(id: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)))
    .limit(1);

  if (!row) return null;

  const tagMap = await fetchTagsForTransactions([row.id]);
  return serialize({ ...row, tags: tagMap.get(row.id) ?? [] });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createTransaction(
  organizationId: string,
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionResponse> {
  const { accountId, toAccountId, type, amount, date, payee, notes, categoryId, tagIds } = input;

  // Validate that the account belongs to this org
  const [acct] = await db
    .select({ id: team.id, organizationId: team.organizationId })
    .from(team)
    .where(and(eq(team.id, accountId), eq(team.organizationId, organizationId)))
    .limit(1);

  if (!acct) {
    throw new NotFoundError('Account not found');
  }

  // Transfer requires a destination account
  if (type === 'transfer') {
    if (!toAccountId) {
      throw new InvalidInputError('INVALID_TRANSFER', 'toAccountId is required for transfers');
    }

    const [toAcct] = await db
      .select({ id: team.id })
      .from(team)
      .where(and(eq(team.id, toAccountId), eq(team.organizationId, organizationId)))
      .limit(1);

    if (!toAcct) {
      throw new NotFoundError('Destination account not found');
    }

    // Verify user has access to the destination account
    const toAccess = await resolveUserAccountAccess(userId, toAccountId);
    if (!toAccess) {
      throw new ForbiddenError('No access to destination account');
    }
  }

  // Run everything in a single DB transaction
  return db.transaction(async (tx) => {
    const transferId = type === 'transfer' ? crypto.randomUUID() : null;

    const [outflow] = await tx
      .insert(transaction)
      .values({
        organizationId,
        accountId,
        categoryId: categoryId ?? null,
        type,
        amount: toSignedAmount(amount, type), // expense/transfer = negative
        date,
        payee: payee ?? null,
        notes: notes ?? null,
        transferId,
      })
      .returning();

    if (!outflow) throw new DatabaseError('Failed to create transaction');

    // Create paired inflow for transfers
    if (type === 'transfer' && toAccountId && transferId) {
      await tx.insert(transaction).values({
        organizationId,
        accountId: toAccountId,
        categoryId: categoryId ?? null,
        type: 'transfer',
        amount, // positive: inflow
        date,
        payee: payee ?? null,
        notes: notes ?? null,
        transferId,
      });
    }

    // Associate tags
    if (tagIds && tagIds.length > 0) {
      await tx
        .insert(transactionTag)
        .values(tagIds.map((tagId) => ({ transactionId: outflow.id, tagId })));
    }

    // Re-fetch with tags to build the response
    const tagRows =
      tagIds && tagIds.length > 0
        ? await tx
            .select()
            .from(tag)
            .where(
              sql`${tag.id} = ANY(ARRAY[${sql.join(
                tagIds.map((id) => sql`${id}`),
                sql`, `
              )}]::text[])`
            )
        : [];

    return serialize({ ...outflow, tags: tagRows });
  });
}

export async function updateTransaction(
  id: string,
  organizationId: string,
  input: UpdateTransactionInput
): Promise<TransactionResponse | null> {
  const existing = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!existing) return null;

  const updates: Record<string, unknown> = {};
  if (input.date !== undefined) updates.date = input.date;
  if (input.payee !== undefined) updates.payee = input.payee ?? null;
  if (input.notes !== undefined) updates.notes = input.notes ?? null;
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId ?? null;
  if (input.amount !== undefined) {
    if (existing.type === 'transfer') {
      // Preserve original sign: outflow is negative, inflow is positive
      updates.amount = existing.amount >= 0 ? input.amount : -input.amount;
    } else {
      updates.amount = toSignedAmount(input.amount, existing.type as TransactionType);
    }
  }

  return db.transaction(async (tx) => {
    let updated = existing;

    if (Object.keys(updates).length > 0) {
      const [row] = await tx
        .update(transaction)
        .set(updates)
        .where(and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)))
        .returning();
      if (!row) return null;
      updated = row;
    }

    // Mirror updates to the paired transfer transaction
    if (existing.transferId && Object.keys(updates).length > 0) {
      const pairedUpdates: Record<string, unknown> = {};
      if (input.date !== undefined) pairedUpdates.date = input.date;
      if (input.payee !== undefined) pairedUpdates.payee = input.payee ?? null;
      if (input.notes !== undefined) pairedUpdates.notes = input.notes ?? null;
      if (input.amount !== undefined) {
        // Paired side always has the opposite sign
        pairedUpdates.amount = -(updates.amount as number);
      }

      if (Object.keys(pairedUpdates).length > 0) {
        await tx
          .update(transaction)
          .set(pairedUpdates)
          .where(
            and(
              eq(transaction.transferId, existing.transferId),
              eq(transaction.organizationId, organizationId),
              // exclude the transaction we just updated
              sql`${transaction.id} != ${id}`
            )
          );
      }
    }

    // Replace tags if provided
    if (input.tagIds !== undefined) {
      await tx.delete(transactionTag).where(eq(transactionTag.transactionId, id));
      if (input.tagIds.length > 0) {
        await tx
          .insert(transactionTag)
          .values(input.tagIds.map((tagId) => ({ transactionId: id, tagId })));
      }
    }

    const tagMap = await fetchTagsForTransactions([updated.id]);
    return serialize({ ...updated, tags: tagMap.get(updated.id) ?? [] });
  });
}

export async function listPayees(organizationId: string, q?: string): Promise<string[]> {
  const trimmed = q?.trim();
  const conditions = [eq(transaction.organizationId, organizationId), isNotNull(transaction.payee)];

  if (trimmed) {
    conditions.push(ilike(transaction.payee, `%${trimmed}%`));
  }

  const rows = await db
    .selectDistinct({ payee: transaction.payee })
    .from(transaction)
    .where(and(...conditions))
    .orderBy(transaction.payee);

  return rows.map((r) => r.payee as string);
}

export async function deleteTransaction(
  id: string,
  organizationId: string
): Promise<TransactionResponse | null> {
  const existing = await db
    .select()
    .from(transaction)
    .where(and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!existing) return null;

  const result = serialize({ ...existing, tags: [] });

  await db.transaction(async (tx) => {
    // If it's a transfer, delete the paired transaction too
    if (existing.transferId) {
      await tx
        .delete(transaction)
        .where(
          and(
            eq(transaction.transferId, existing.transferId),
            eq(transaction.organizationId, organizationId)
          )
        );
    } else {
      await tx
        .delete(transaction)
        .where(and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)));
    }
  });

  return result;
}
