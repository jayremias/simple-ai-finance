import { rateLimiter } from 'hono-rate-limiter';

type RateLimiterOptions = {
  windowMs?: number;
  limit?: number;
};

function getClientKey(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown'
  );
}

export function createLimiter(options: RateLimiterOptions = {}) {
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
