import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { env } from '@/env';
import { AppError } from '@/lib/errors';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id?: string;
  };
}

function buildErrorResponse(
  c: Context,
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const requestId = c.get('requestId') as string | undefined;

  const body: ErrorResponse = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { request_id: requestId } : {}),
    },
  };

  return c.json(body, status as StatusCodes.BAD_REQUEST);
}

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return buildErrorResponse(c, err.statusCode, err.code, err.message);
  }

  if (err instanceof HTTPException) {
    return buildErrorResponse(
      c,
      err.status,
      httpStatusToCode(err.status),
      err.message || 'An error occurred'
    );
  }

  if (err instanceof ZodError) {
    return buildErrorResponse(c, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', {
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Unknown errors — log full details, return generic message in production
  console.error('[ERROR]', err);

  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return buildErrorResponse(c, StatusCodes.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', message);
};

export const notFound: NotFoundHandler = (c) => {
  return buildErrorResponse(
    c,
    StatusCodes.NOT_FOUND,
    'NOT_FOUND',
    `Route ${c.req.method} ${c.req.path} not found`
  );
};

function httpStatusToCode(status: number): string {
  const codes: Record<number, string> = {
    [StatusCodes.BAD_REQUEST]: 'BAD_REQUEST',
    [StatusCodes.UNAUTHORIZED]: 'UNAUTHORIZED',
    [StatusCodes.FORBIDDEN]: 'FORBIDDEN',
    [StatusCodes.NOT_FOUND]: 'NOT_FOUND',
    [StatusCodes.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
    [StatusCodes.REQUEST_TIMEOUT]: 'REQUEST_TIMEOUT',
    [StatusCodes.CONFLICT]: 'CONFLICT',
    [StatusCodes.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
    [StatusCodes.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
  };
  return codes[status] ?? 'INTERNAL_ERROR';
}
