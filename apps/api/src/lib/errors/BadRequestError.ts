import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string) {
    super('BAD_REQUEST', message, 400);
  }
}
