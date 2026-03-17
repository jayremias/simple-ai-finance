import type { ParseTransactionsResponse } from '@moneylens/shared';
import { parseTransactionsResponseSchema } from '@moneylens/shared';
import { env } from './env';

interface ParseContext {
  defaultCurrency?: string;
  accountName?: string;
  today?: string; // YYYY-MM-DD — for resolving relative dates
}

/**
 * Parses extracted text into structured transaction items using a cheap AI model.
 * Returns a list of parsed items with individual confidence scores and an overall
 * sourceConfidence score reflecting how clean the input text was.
 */
export async function parseTransactionsFromText(
  text: string,
  context: ParseContext = {}
): Promise<ParseTransactionsResponse> {
  const { ai } = await import('./client');

  const today = context.today ?? new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are a financial transaction parser. Given extracted text from a bank statement, receipt, or invoice, extract all individual transactions.

Rules:
- amounts are ALWAYS positive integers in cents (multiply by 100, no decimals)
- dates must be YYYY-MM-DD format; resolve relative dates using today=${today}
- type: "income" for money received, "expense" for money spent, "transfer" if explicitly between accounts
- categoryHint: suggest a category name in English (e.g. "Food & Dining", "Transport", "Shopping")
- confidence per item: 0.0–1.0 based on how clear/complete that transaction's data is
- sourceConfidence: 0.0–1.0 overall quality of the source text
- Output ONLY valid JSON matching this exact schema, no markdown:
{
  "items": [
    {
      "type": "expense",
      "amount": 1250,
      "date": "2024-01-15",
      "payee": "Starbucks",
      "notes": "Coffee",
      "categoryHint": "Food & Dining",
      "confidence": 0.95
    }
  ],
  "sourceConfidence": 0.9
}`;

  const userPrompt = [
    context.accountName ? `Account: ${context.accountName}` : null,
    context.defaultCurrency ? `Currency: ${context.defaultCurrency}` : null,
    '',
    text,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const response = await ai.chat.completions.create({
    model: env.AI_MODEL,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  return parseTransactionsResponseSchema.parse(parsed);
}
