import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';
import { member, organization } from '@/lib/db/schema/organization';
import { seedDefaultCategories } from '@/services/categories.service';

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

  if (!created) throw new Error('Failed to create test user');
  return created;
}

/**
 * Creates a session row for the given user and returns the token.
 * Use the token as `Authorization: Bearer <token>` in test requests.
 */
export async function createTestSession(
  userId: string,
  opts: { activeOrganizationId?: string } = {}
): Promise<string> {
  const token = crypto.randomUUID();

  await db.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    createdAt: new Date(),
    updatedAt: new Date(),
    activeOrganizationId: opts.activeOrganizationId ?? null,
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
 * Creates an organization and adds `userId` as an owner.
 * Returns the inserted organization.
 */
export async function createTestOrg(
  userId: string,
  role: 'owner' | 'editor' | 'member' | 'viewer' = 'owner'
) {
  const orgId = crypto.randomUUID();

  const [org] = await db
    .insert(organization)
    .values({
      id: orgId,
      name: 'Personal',
      slug: `personal-${orgId.slice(0, 8)}`,
      createdAt: new Date(),
    })
    .returning();

  if (!org) throw new Error('Failed to create test org');

  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role,
    createdAt: new Date(),
  });

  return org;
}

/**
 * Sets the activeOrganizationId on the session matching this token.
 */
export async function setActiveOrg(token: string, organizationId: string): Promise<void> {
  await db
    .update(session)
    .set({ activeOrganizationId: organizationId })
    .where(eq(session.token, token));
}

/**
 * Creates a user + org (as owner) + session with activeOrganizationId set.
 * Returns `{ user, org, token }` ready for use in accounts tests.
 */
export async function createAuthenticatedUserWithOrg(options: CreateTestUserOptions = {}) {
  const testUser = await createTestUser(options);
  const org = await createTestOrg(testUser.id);
  await seedDefaultCategories(org.id);
  const token = await createTestSession(testUser.id, { activeOrganizationId: org.id });
  return { user: testUser, org, token };
}

/**
 * Returns an Authorization header object for the given session token.
 */
export function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
