import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default('*'),
  STRIPE_SECRET_KEY: z.string().default(''),
  REVENUECAT_WEBHOOK_SECRET: z.string().default(''),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  production: parsedEnv.NODE_ENV === 'production',
  test: parsedEnv.NODE_ENV === 'test',
  getCorsOrigins: () =>
    parsedEnv.CORS_ORIGINS === '*'
      ? '*'
      : parsedEnv.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
};

if (env.production && env.CORS_ORIGINS === '*') {
  console.warn(
    "[security] CORS_ORIGINS is set to '*' in production — restrict to specific origins"
  );
}
