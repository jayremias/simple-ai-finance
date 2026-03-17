import { env } from '../env';

/**
 * Sends an image (or PDF bytes) to the vision model and returns extracted text.
 * @param base64Data - base64-encoded file content
 * @param mimeType - MIME type of the file (image/jpeg, image/png, application/pdf, etc.)
 */
export async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
  const { ai } = await import('../client');

  const response = await ai.chat.completions.create({
    model: env.AI_VISION_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all financial transaction data from this document. Output the raw text preserving all numbers, dates, descriptions, and amounts exactly as they appear. Do not summarize or interpret — just extract.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`,
            },
          },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? '';
}
