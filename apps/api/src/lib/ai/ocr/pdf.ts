import { extractText, getDocumentProxy } from 'unpdf';
import { env } from '../env';
import { extractTextFromImage } from './image';

interface PdfOcrResult {
  text: string;
  usedVision: boolean;
}

/**
 * Extracts text from a PDF buffer.
 *
 * Pipeline:
 * 1. unpdf extracts raw text (free, no API call)
 * 2. Cheap AI model scores extraction confidence
 * 3. If confidence < threshold → vision model re-processes the PDF pages as images (fallback)
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfOcrResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });

  // If the PDF yields no meaningful text (e.g. scanned image PDF), go straight to vision
  const cleanText = text.trim();
  if (cleanText.length < 50) {
    const visionText = await extractTextFromPdfViaVision(buffer);
    return { text: visionText, usedVision: true };
  }

  // Score extraction confidence with cheap model
  const confidence = await scorePdfTextConfidence(cleanText);

  if (confidence < env.AI_PDF_CONFIDENCE_THRESHOLD) {
    const visionText = await extractTextFromPdfViaVision(buffer);
    return { text: visionText, usedVision: true };
  }

  return { text: cleanText, usedVision: false };
}

/**
 * Asks the cheap model to rate (0.0–1.0) how well-structured and readable
 * the extracted PDF text is for financial transaction parsing.
 */
async function scorePdfTextConfidence(text: string): Promise<number> {
  const { ai } = await import('../client');

  const preview = text.slice(0, 2000); // cap tokens sent to model

  const response = await ai.chat.completions.create({
    model: env.AI_MODEL,
    max_tokens: 10,
    messages: [
      {
        role: 'system',
        content:
          'You are a quality assessor. Rate the readability and structure of the following extracted PDF text for financial transaction parsing. ' +
          'Output ONLY a decimal number between 0.0 and 1.0. ' +
          '1.0 = perfectly readable table/list of transactions. ' +
          '0.0 = garbled, unreadable, or missing data.',
      },
      { role: 'user', content: preview },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '0';
  const score = Number.parseFloat(raw);
  return Number.isNaN(score) ? 0 : Math.min(1, Math.max(0, score));
}

/**
 * Converts the PDF to a base64 image and sends to vision model.
 * Uses the first page as a representative sample — the caller may want
 * to handle multi-page PDFs by splitting and calling per-page.
 */
async function extractTextFromPdfViaVision(buffer: Buffer): Promise<string> {
  // Encode the raw PDF bytes as base64 and pass to vision model
  // Vision models (e.g. Gemini, GPT-4V) can read PDF bytes directly via base64
  const base64 = buffer.toString('base64');
  return extractTextFromImage(base64, 'application/pdf');
}
