import { env } from '@/env';
import type { MiddlewareHandler } from 'hono';

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function statusColor(status: number): string {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  return colors.green;
}

export const logger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = performance.now();

    await next();

    const duration = Math.round(performance.now() - start);
    const method = c.req.method;
    const path = c.req.path;
    const status = c.res.status;
    const requestId = (c.get('requestId') as string | undefined) ?? '-';

    // Skip health check logs in production to reduce noise
    if (env.NODE_ENV === 'production' && path.endsWith('/health')) {
      return;
    }

    if (env.NODE_ENV === 'production') {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          method,
          path,
          status,
          duration_ms: duration,
          request_id: requestId,
        })
      );
    } else {
      const sc = statusColor(status);
      console.log(
        `${colors.dim}←${colors.reset} ${colors.magenta}${method}${colors.reset} ${path} ${sc}${status}${colors.reset} ${colors.dim}${duration}ms${colors.reset} ${colors.dim}[${requestId}]${colors.reset}`
      );
    }
  };
};
