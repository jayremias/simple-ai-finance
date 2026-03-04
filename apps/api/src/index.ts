import { env } from '@/env';
import { auth } from '@/lib/auth';
import { setupMiddleware } from '@/middleware';
import type { AuthVariables } from '@/middleware/auth';
import { notFound, onError } from '@/middleware/error-handler';
import { authLimiter, sensitiveAuthLimiter } from '@/middleware/rate-limiter';
import health from '@/routes/health';
import users from '@/routes/users';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import accounts from '@/routes/accounts';
import authRoutes from '@/routes/auth';

const app = new Hono();

app.onError(onError);
app.notFound(notFound);

// --- Auth routes (/api/auth/**) ---

app.use(
  '/api/auth/*',
  cors({
    origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
    credentials: true,
  })
);
app.use('/api/auth/*', authLimiter);
app.use('/api/auth/forget-password', sensitiveAuthLimiter);
app.use('/api/auth/reset-password', sensitiveAuthLimiter);
app.use('/api/auth/delete-user', sensitiveAuthLimiter);
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));
app.route('/', authRoutes);

// --- Business routes (/api/v1/*) ---

const api = new Hono<{ Variables: AuthVariables }>().basePath('/api/v1');
setupMiddleware(api);
api.route('/', health);
api.route('/users', users);
api.route('/', accounts);

app.route('/', api);

export { app };

if (process.env.NODE_ENV !== 'test') {
  console.log(`MoneyLens API running on port ${env.PORT}`);
}

export default {
  port: env.PORT,
  fetch: app.fetch,
};
