import { env } from '@/env';
import { setupMiddleware } from '@/middleware';
import type { AuthVariables } from '@/middleware/auth';
import { notFound, onError } from '@/middleware/error-handler';
import accounts from '@/routes/accounts';
import authRoutes from '@/routes/auth';
import health from '@/routes/health';
import { Hono } from 'hono';

const app = new Hono();

app.onError(onError);
app.notFound(notFound);

// --- Auth routes (/api/auth/**) ---
app.route('/', authRoutes);

// --- Business routes (/api/v1/*) ---

const api = new Hono<{ Variables: AuthVariables }>().basePath('/api/v1');
setupMiddleware(api);
api.route('/', health);
api.route('/', accounts);

app.route('/', api);

console.log(`MoneyLens API running on port ${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
