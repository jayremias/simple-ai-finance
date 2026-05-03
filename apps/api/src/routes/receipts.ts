import { extractReceiptSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { createUploadUrl, extractFromKey } from '@/services/receipt.service';

const receipts = new Hono<{ Variables: AuthVariables }>().basePath('/receipts').use(requireAuth);

// POST /receipts/upload-url
receipts.post('/upload-url', async (c) => {
  const result = await createUploadUrl();
  return c.json(result, 201);
});

// POST /receipts/extract
receipts.post('/extract', validate('json', extractReceiptSchema), async (c) => {
  const { key } = c.req.valid('json');
  const result = await extractFromKey(key);
  return c.json(result);
});

export default receipts;
