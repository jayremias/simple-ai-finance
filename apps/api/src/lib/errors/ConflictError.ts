import { StatusCodes } from 'http-status-codes';
import { AppError } from './AppError';

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, StatusCodes.CONFLICT);
  }
}
