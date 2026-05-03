import { StatusCodes } from 'http-status-codes';
import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', message, StatusCodes.FORBIDDEN);
  }
}
