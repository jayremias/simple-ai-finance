import { randomUUID } from 'node:crypto';
import type { ParseTransactionsResponse } from '@moneylens/shared';
import { extractText } from '@/lib/ai/ocr';
import { parseTransactionsFromText } from '@/lib/ai/parse';
import { InvalidInputError } from '@/lib/errors';
import { getObject, getPresignedUploadUrl } from '@/lib/s3';

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function createUploadUrl(): Promise<{ url: string; key: string }> {
  const key = `receipts/${randomUUID()}`;
  const url = await getPresignedUploadUrl(key);
  return { url, key };
}

export async function extractFromKey(
  key: string,
  context: { defaultCurrency?: string; accountName?: string } = {}
): Promise<ParseTransactionsResponse> {
  const buffer = await getObject(key);

  // Infer MIME type from key extension; default to JPEG for camera captures
  const extension = key.split('.').pop()?.toLowerCase();
  const mimeTypeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  const mimeType = extension && mimeTypeMap[extension] ? mimeTypeMap[extension] : 'image/jpeg';

  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new InvalidInputError('UNSUPPORTED_FILE_TYPE', `Unsupported file type: ${mimeType}`);
  }

  const { text } = await extractText(buffer, mimeType);
  return parseTransactionsFromText(text, {
    defaultCurrency: context.defaultCurrency,
    accountName: context.accountName,
    today: new Date().toISOString().slice(0, 10),
  });
}
