/**
 * Generic base64 cursor codec for cursor-based pagination.
 * The payload shape is decided by the caller (e.g. `{ date, id }` or `{ createdAt, id }`).
 */
export function encodeCursor<Payload extends Record<string, unknown>>(payload: Payload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeCursor<Payload extends Record<string, unknown>>(
  cursor: string
): Payload | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Payload;
  } catch {
    return null;
  }
}
