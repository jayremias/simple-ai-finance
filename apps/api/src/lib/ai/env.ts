import { z } from 'zod';

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  // Cheap/fast model for text parsing and confidence scoring (e.g. google/gemini-flash-1.5)
  AI_MODEL: z.string().default('google/gemini-flash-1.5'),
  // Vision-capable model for OCR fallback (e.g. google/gemini-pro-vision)
  AI_VISION_MODEL: z.string().default('google/gemini-pro-vision'),
  // Confidence threshold (0-1): below this, PDF text is considered low quality → vision fallback
  AI_PDF_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
});

export const env = envSchema.parse(process.env);
