import { StatusCodes } from 'http-status-codes';
import { AppError } from './AppError';

export class PaymentRequiredError extends AppError {
  constructor(message = 'Premium subscription required') {
    super('PAYMENT_REQUIRED', message, StatusCodes.PAYMENT_REQUIRED);
  }
}
