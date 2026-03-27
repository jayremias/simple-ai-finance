import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { app } from '@/index';
import { bearerHeader, createAuthenticatedUserWithOrg } from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

mock.module('@/lib/s3', () => ({
  getPresignedUploadUrl: async (_key: string) =>
    'http://localhost:9000/statements/test-key?X-Amz-Signature=sig',
  getObject: async (_key: string) => Buffer.from('%PDF-1.4 fake pdf content'),
}));

mock.module('@/lib/ai/ocr', () => ({
  extractText: async (_buffer: Buffer, _mimeType: string) => ({
    text: 'Date\tDescription\tAmount\n2026-03-01\tStarbucks\t-12.50\n2026-03-05\tSalary\t3000.00',
    usedVision: false,
  }),
}));

mock.module('@/lib/ai/parse', () => ({
  parseTransactionsFromText: async (_text: string, _context: unknown) => ({
    items: [
      {
        type: 'expense',
        amount: 1250,
        date: '2026-03-01',
        payee: 'Starbucks',
        confidence: 0.95,
      },
      {
        type: 'income',
        amount: 300_000,
        date: '2026-03-05',
        payee: 'Salary',
        confidence: 0.98,
      },
    ],
    sourceConfidence: 0.92,
  }),
}));

type ErrorResponse = { error: { code: string; message: string } };

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// POST /api/v1/statements/upload-url
// ---------------------------------------------------------------------------

describe('POST /api/v1/statements/upload-url', () => {
  test('returns presigned url and key', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/statements/upload-url', {
      method: 'POST',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { url: string; key: string };
    expect(body.url).toContain('http://localhost:9000');
    expect(body.key).toMatch(/^statements\//);
    expect(body.key).toMatch(/\.pdf$/);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.request('/api/v1/statements/upload-url', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/statements/import
// ---------------------------------------------------------------------------

describe('POST /api/v1/statements/import', () => {
  test('returns matched/missing/extra classification', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    // Create an account to import into
    const accountRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Checking',
        type: 'checking',
        currency: 'USD',
        initial_balance: 0,
      }),
    });
    const account = (await accountRes.json()) as { teamId: string };

    const res = await app.request('/api/v1/statements/import', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'statements/some-uuid.pdf', accountId: account.teamId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { matched: unknown[]; missing: unknown[]; extra: unknown[] };
    // No existing transactions → all 2 items are missing
    expect(body.matched).toHaveLength(0);
    expect(body.missing).toHaveLength(2);
    expect(body.extra).toHaveLength(0);
  });

  test('detects already-imported transactions as matched', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const accountRes = await app.request('/api/v1/accounts', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Checking',
        type: 'checking',
        currency: 'USD',
        initial_balance: 0,
      }),
    });
    const account = (await accountRes.json()) as { teamId: string };

    // Pre-create the Starbucks transaction that matches the first imported item
    await app.request('/api/v1/transactions', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.teamId,
        type: 'expense',
        amount: 1250,
        date: '2026-03-01',
        payee: 'Starbucks',
      }),
    });

    const res = await app.request('/api/v1/statements/import', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'statements/some-uuid.pdf', accountId: account.teamId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { matched: unknown[]; missing: unknown[]; extra: unknown[] };
    expect(body.matched).toHaveLength(1);
    expect(body.missing).toHaveLength(1);
    expect(body.extra).toHaveLength(0);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.request('/api/v1/statements/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'statements/test.pdf', accountId: 'acc-1' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when body is missing required fields', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/statements/import', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'statements/test.pdf' }), // missing accountId
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
