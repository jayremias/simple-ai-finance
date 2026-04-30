import { StatusCodes } from 'http-status-codes';
import { AppError } from '.';

export const S3_ERROR_TYPES = [
  'OBJECT_NOT_FOUND',
  'ACCESS_DENIED',
  'UPLOAD_FAILED',
  'INVALID_KEY',
  'SERVICE_UNAVAILABLE',
  'UNKNOWN',
] as const;

const STATUS: Record<S3ErrorType, number> = {
  OBJECT_NOT_FOUND: StatusCodes.NOT_FOUND,
  ACCESS_DENIED: StatusCodes.FORBIDDEN,
  INVALID_KEY: StatusCodes.BAD_REQUEST,
  SERVICE_UNAVAILABLE: StatusCodes.SERVICE_UNAVAILABLE,
  UPLOAD_FAILED: StatusCodes.INTERNAL_SERVER_ERROR,
  UNKNOWN: StatusCodes.INTERNAL_SERVER_ERROR,
};

export type S3ErrorType = (typeof S3_ERROR_TYPES)[number];

export class S3Error extends AppError {
  constructor(
    public readonly type: S3ErrorType,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(`S3_${type}`, message, STATUS[type]);
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}
