import { importStatementSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { getStatementUploadUrl, importStatement } from '@/services/statement.service';

const statements = new Hono<{ Variables: AuthVariables }>()
  .basePath('/statements')
  .use(requireAuth);

// POST /statements/upload-url
statements.post('/upload-url', async (c) => {
  const result = await getStatementUploadUrl();
  return c.json(result, 201);
});

// POST /statements/import
statements.post('/import', async (c) => {
  const session = c.get('session');
  const organizationId = session?.activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'No active organization.' } }, 400);
  }

  const body = await c.req.json();
  const parsed = importStatementSchema.safeParse(body);
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

  const result = await importStatement(parsed.data.key, parsed.data.accountId, organizationId);
  return c.json(result);
});

export default statements;
