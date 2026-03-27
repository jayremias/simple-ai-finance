import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { app } from '@/index';
import { bearerHeader, createAuthenticatedUser } from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

mock.module('@/lib/s3', () => ({
  getPresignedUploadUrl: async (_key: string) =>
    'http://localhost:9000/receipts/test-key?X-Amz-Signature=sig',
  getObject: async (_key: string) => Buffer.from('fake-image-data'),
}));

mock.module('@/lib/ai/ocr', () => ({
  extractText: async (_buffer: Buffer, _mimeType: string) => ({
    text: 'Starbucks\n$12.50\n2026-03-24',
    usedVision: true,
  }),
}));

mock.module('@/lib/ai/parse', () => ({
  parseTransactionsFromText: async (_text: string, _context: unknown) => ({
    items: [
      {
        type: 'expense',
        amount: 1250,
        date: '2026-03-24',
        payee: 'Starbucks',
        notes: 'Coffee',
        categoryHint: 'Food & Dining',
        confidence: 0.95,
      },
    ],
    sourceConfidence: 0.9,
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
// POST /api/v1/receipts/upload-url
// ---------------------------------------------------------------------------

describe('POST /api/v1/receipts/upload-url', () => {
  test('returns presigned url and key', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/receipts/upload-url', {
      method: 'POST',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { url: string; key: string };
    expect(body.url).toContain('http://localhost:9000');
    expect(body.key).toMatch(/^receipts\//);
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.request('/api/v1/receipts/upload-url', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/receipts/extract
// ---------------------------------------------------------------------------

describe('POST /api/v1/receipts/extract', () => {
  test('returns extracted transaction items', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/receipts/extract', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'receipts/some-uuid' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { payee: string }[]; sourceConfidence: number };
    expect(body.items).toHaveLength(1);
    expect(body.sourceConfidence).toBe(0.9);
    expect(body.items[0]?.payee).toBe('Starbucks');
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.request('/api/v1/receipts/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'receipts/some-uuid' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when key is missing', async () => {
    const { token } = await createAuthenticatedUser();

    const res = await app.request('/api/v1/receipts/extract', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
