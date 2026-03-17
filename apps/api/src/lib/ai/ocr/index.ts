import { extractTextFromImage } from './image';
import { extractTextFromPdf } from './pdf';

export interface OcrResult {
  text: string;
  usedVision: boolean;
}

/**
 * Routes to the correct extraction strategy based on MIME type.
 * PDF → unpdf text extraction + confidence scoring + vision fallback
 * Image → direct vision model
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer);
  }

  // All image types (image/jpeg, image/png, image/webp, etc.)
  if (mimeType.startsWith('image/')) {
    const base64 = buffer.toString('base64');
    const text = await extractTextFromImage(base64, mimeType);
    return { text, usedVision: true };
  }

  throw Object.assign(new Error(`Unsupported file type: ${mimeType}`), {
    code: 'UNSUPPORTED_FILE_TYPE',
  });
}
