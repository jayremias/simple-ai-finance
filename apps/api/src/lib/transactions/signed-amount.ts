/**
 * Converts a positive amount to a signed integer based on transaction type.
 * Income increases balance (positive), expense/transfer decreases (negative).
 */
export function toSignedAmount(amount: number, type: 'income' | 'expense' | 'transfer'): number {
  return type === 'income' ? amount : -amount;
}
