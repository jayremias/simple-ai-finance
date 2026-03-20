import { AppError } from './AppError';

export class DatabaseError extends AppError {
  constructor(message: string) {
    super('DATABASE_ERROR', message, 500);
  }
}
