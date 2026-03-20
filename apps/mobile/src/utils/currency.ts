/**
 * Converts a cent integer to a display string.
 * Always uses the absolute value — callers handle sign based on transaction type.
 *
 * @example centsToDisplay(1999) → "19.99"
 */
export function centsToDisplay(cents: number): string {
  return String(Math.abs(cents) / 100);
}

/**
 * Converts a display string (from user input) to a cent integer.
 * Returns NaN if the input is not a valid positive number.
 *
 * @example displayToCents("19.99") → 1999
 */
export function displayToCents(value: string): number {
  return Math.round(parseFloat(value) * 100);
}
