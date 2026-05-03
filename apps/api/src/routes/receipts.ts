import { extractReceiptSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { createUploadUrl, extractFromKey } from '@/services/receipt.service';

const receipts = new Hono<{ Variables: AuthVariables }>().use(requireAuth);

// POST /receipts/upload-url
receipts.post('/upload-url', async (c) => {
  const result = await createUploadUrl();
  return c.json(result, StatusCodes.CREATED);
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
      StatusCodes.BAD_REQUEST
    );
  }

  const result = await extractFromKey(parsed.data.key);
  return c.json(result);
});

export default receipts;
