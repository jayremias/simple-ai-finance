import { importStatementSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import type { AuthVariables } from '@/middleware/auth';
import { requireAuth } from '@/middleware/auth';
import { requireActiveOrg, requireOrgMembership } from '@/middleware/organization';
import { validate } from '@/middleware/validate';
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
statements.post(
  '/import',
  requireActiveOrg,
  requireOrgMembership(),
  validate('json', importStatementSchema),
  async (c) => {
    const organizationId = c.get('organizationId') as string;
    const { key, accountId } = c.req.valid('json');

    const result = await importStatement(key, accountId, organizationId);
    return c.json(result);
  }
);

export default statements;
