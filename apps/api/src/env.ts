import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().default(3000),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	CORS_ORIGINS: z.string().default("*"),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.CORS_ORIGINS === "*") {
	console.warn("[security] CORS_ORIGINS is set to '*' in production — restrict to specific origins");
}
