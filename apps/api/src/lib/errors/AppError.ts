/**
 * Base class for all application domain errors.
 * Routes and middleware can use `instanceof AppError` to distinguish
 * domain errors from unexpected runtime errors.
 */
import { StatusCodes } from 'http-status-codes';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
