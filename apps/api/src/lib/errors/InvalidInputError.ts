import { AppError } from './AppError';

export class InvalidInputError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}
