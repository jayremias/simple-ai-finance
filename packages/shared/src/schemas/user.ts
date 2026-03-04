import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["BRL", "USD"] as const;
export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;

export const updateUserProfileSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	image: z.string().url().nullable().optional(),
	defaultCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
	locale: z.enum(SUPPORTED_LOCALES).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const userProfileResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	defaultCurrency: z.enum(SUPPORTED_CURRENCIES),
	locale: z.enum(SUPPORTED_LOCALES),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
