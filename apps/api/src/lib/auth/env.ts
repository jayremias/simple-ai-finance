import { z } from "zod";

const envSchema = z.object({
	BETTER_AUTH_URL: z.string().url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	GOOGLE_CLIENT_ID: z.string().default(""),
	GOOGLE_CLIENT_SECRET: z.string().default(""),
	APPLE_CLIENT_ID: z.string().default(""),
	APPLE_CLIENT_SECRET: z.string().default(""),
});

export const env = envSchema.parse(process.env);
