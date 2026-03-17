import OpenAI from 'openai';
import { env } from './env';

// OpenAI SDK pointed at OpenRouter — supports any model via model string
export const ai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENROUTER_API_KEY,
});
