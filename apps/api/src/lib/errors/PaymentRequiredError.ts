import { AppError } from './AppError';

export class PaymentRequiredError extends AppError {
  constructor(message = 'Premium subscription required') {
    super('PAYMENT_REQUIRED', message, 402);
  }
}
