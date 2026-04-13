import { extractReceiptSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { createUploadUrl, extractFromKey } from '@/services/receipt.service';

const receipts = new Hono<{ Variables: AuthVariables }>().basePath('/receipts').use(requireAuth);

// POST /receipts/upload-url
receipts.post('/upload-url', async (c) => {
  const result = await createUploadUrl();
  return c.json(result, 201);
});

// POST /receipts/extract
receipts.post('/extract', async (c) => {
  const body = await c.req.json();
  const parsed = extractReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  const result = await extractFromKey(parsed.data.key);
  return c.json(result);
});

export default receipts;
