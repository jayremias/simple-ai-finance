import { StatusCodes } from 'http-status-codes';
import { AppError } from './AppError';

export class DatabaseError extends AppError {
  constructor(message: string) {
    super('DATABASE_ERROR', message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
