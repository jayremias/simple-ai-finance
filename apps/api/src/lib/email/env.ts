import { z } from "zod";

const envSchema = z.object({
	RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
	EMAIL_FROM: z.string().default("MoneyLens <onboarding@resend.dev>"),
});

export const env = envSchema.parse(process.env);
