import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';

type CreateTestUserOptions = {
  name?: string;
  email?: string;
  emailVerified?: boolean;
};

/**
 * Creates a user row directly in the test DB (bypasses Better Auth).
 * Returns the inserted user.
 */
export async function createTestUser(options: CreateTestUserOptions = {}) {
  const {
    name = 'Test User',
    email = `test-${Date.now()}@example.com`,
    emailVerified = true,
  } = options;

  const [created] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name,
      email,
      emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

/**
 * Creates a session row for the given user and returns the token.
 * Use the token as `Authorization: Bearer <token>` in test requests.
 */
export async function createTestSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();

  await db.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return token;
}

/**
 * Creates a user + session in one call.
 * Returns `{ user, token }` ready for use in test requests.
 */
export async function createAuthenticatedUser(options: CreateTestUserOptions = {}) {
  const testUser = await createTestUser(options);
  const token = await createTestSession(testUser.id);
  return { user: testUser, token };
}

/**
 * Returns an Authorization header object for the given session token.
 */
export function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
