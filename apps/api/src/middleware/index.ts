import { MINUTE_IN_SECONDS } from '@moneylens/shared';
import type { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { env } from '@/env';
import type { AuthVariables } from './auth';
import { sessionMiddleware } from './auth';
import { logger } from './logger';
import { globalLimiter } from './rate-limiter';

function parseCorsOrigins(raw: string): string | string[] {
  if (raw === '*') return '*';
  return raw.split(',').map((o) => o.trim());
}

export function setupMiddleware(app: Hono<{ Variables: AuthVariables }>) {
  // 1. Request ID — generates unique ID per request
  app.use(requestId());

  // 2. Structured logger — method, path, status, duration, request ID
  app.use(logger());

  // 3. Security headers — HSTS, X-Content-Type-Options, X-Frame-Options, etc.
  app.use(secureHeaders());

  // 4. CORS — configured via CORS_ORIGINS env var
  const origins = parseCorsOrigins(env.CORS_ORIGINS);
  app.use(
    cors({
      origin: origins,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 10 * MINUTE_IN_SECONDS,
      credentials: true,
    })
  );

  // 5. Rate limiter — 100 requests per 15 minutes per IP
  app.use(globalLimiter);

  // 6. Session — populates user/session on every request (null if unauthenticated)
  app.use(sessionMiddleware);
}
