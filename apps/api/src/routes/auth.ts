import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from '@/env';
import { auth } from '@/lib/auth';
import { authLimiter, sensitiveAuthLimiter } from '@/middleware/rate-limiter';

const authRoutes = new Hono().basePath('/api/auth');

authRoutes.use(
  '*',
  cors({
    origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
    credentials: true,
  })
);

authRoutes.use('*', authLimiter);
authRoutes.use('/forget-password', sensitiveAuthLimiter);
authRoutes.use('/reset-password', sensitiveAuthLimiter);
authRoutes.use('/delete-user', sensitiveAuthLimiter);

authRoutes.on(['POST', 'GET'], '/**', (c) => auth.handler(c.req.raw));

export default authRoutes;
