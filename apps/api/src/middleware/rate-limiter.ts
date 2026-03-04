import { rateLimiter } from 'hono-rate-limiter';
import { createMiddleware } from 'hono/factory';

type RateLimiterOptions = {
  windowMs?: number;
  limit?: number;
};

const isTest = process.env.NODE_ENV === 'test';

// In test mode, skip rate limiting entirely
const noopMiddleware = createMiddleware(async (_c, next) => next());

function getClientKey(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown'
  );
}

export function createLimiter(options: RateLimiterOptions = {}) {
  if (isTest) return noopMiddleware;

  const { windowMs = 15 * 60 * 1000, limit = 100 } = options;

  return rateLimiter({
    windowMs,
    limit,
    keyGenerator: (c) => getClientKey(c),
  });
}

export const globalLimiter = createLimiter();

export const authLimiter = createLimiter({ limit: 10 });

export const sensitiveAuthLimiter = createLimiter({ limit: 5 });
