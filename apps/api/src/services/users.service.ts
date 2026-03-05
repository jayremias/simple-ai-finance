import type { UpdateUserProfileInput, UserProfileResponse } from '@moneylens/shared';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, userProfile } from '@/lib/db/schema';

/**
 * Returns the user's profile merged with their auth user record.
 * Auto-creates the user_profile row with defaults if it doesn't exist yet.
 */
export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      defaultCurrency: userProfile.defaultCurrency,
      locale: userProfile.locale,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .leftJoin(userProfile, eq(user.id, userProfile.userId))
    .where(eq(user.id, userId));

  if (!row) {
    throw new Error('USER_NOT_FOUND');
  }

  // Auto-create profile with defaults on first fetch
  if (row.defaultCurrency === null) {
    await db.insert(userProfile).values({ userId }).onConflictDoNothing();
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    defaultCurrency: (row.defaultCurrency ?? 'USD') as UserProfileResponse['defaultCurrency'],
    locale: (row.locale ?? 'en-US') as UserProfileResponse['locale'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Updates the user's name/image (auth user table) and/or profile preferences.
 * Only provided fields are updated — missing fields are left unchanged.
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<UserProfileResponse> {
  const { name, image, defaultCurrency, locale } = input;

  // Update user table if name or image was provided
  const hasUserUpdate = name !== undefined || image !== undefined;
  if (hasUserUpdate) {
    await db
      .update(user)
      .set({
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image }),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));
  }

  // Upsert profile if currency or locale was provided
  const hasProfileUpdate = defaultCurrency !== undefined || locale !== undefined;
  if (hasProfileUpdate) {
    await db
      .insert(userProfile)
      .values({
        userId,
        ...(defaultCurrency && { defaultCurrency }),
        ...(locale && { locale }),
      })
      .onConflictDoUpdate({
        target: userProfile.userId,
        set: {
          ...(defaultCurrency !== undefined && { defaultCurrency }),
          ...(locale !== undefined && { locale }),
          updatedAt: new Date(),
        },
      });
  }

  return getUserProfile(userId);
}
