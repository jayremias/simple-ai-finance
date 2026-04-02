import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { app } from '@/index';
import {
  bearerHeader,
  createAuthenticatedUser,
  createAuthenticatedUserWithOrg,
  createTestOrg,
  createTestOrgMember,
  createTestSession,
  createTestTeamMember,
  createTestUser,
  setActiveOrg,
} from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type ErrorResponse = { error: { code: string; message: string } };

type MemberResponse = {
  userId: string;
  name: string;
  email: string;
  role: string;
  source: 'organization' | 'direct';
  joinedAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; teamId: string }> {
  const res = await app.request('/api/v1/accounts', {
    method: 'POST',
    headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Account',
      type: 'checking',
      currency: 'USD',
      initial_balance: 0,
      ...overrides,
    }),
  });
  if (res.status !== 201) throw new Error(`createAccount failed: ${res.status}`);
  return (await res.json()) as { id: string; teamId: string };
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// GET /api/v1/accounts/:accountId/members
// ---------------------------------------------------------------------------

describe('GET /api/v1/accounts/:accountId/members', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/fake-id/members', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  test('returns 403 when user has no access to the account', async () => {
    // Create owner with account
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Create separate user with no access
    const { token: strangerToken } = await createAuthenticatedUserWithOrg();

    const res = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(strangerToken),
    });

    expect(res.status).toBe(403);
  });

  test('returns org members with source "organization"', async () => {
    const { user: owner, org, token } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(token);

    const res = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { members: MemberResponse[] };
    expect(body.members).toBeArray();

    const ownerMember = body.members.find((member) => member.userId === owner.id);
    expect(ownerMember).toBeDefined();
    expect(ownerMember!.source).toBe('organization');
    expect(ownerMember!.role).toBe('owner');
    expect(ownerMember!.name).toBe(owner.name);
    expect(ownerMember!.email).toBe(owner.email);
  });

  test('returns direct team members with source "direct"', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Create a second user and add them as direct team member
    const directUser = await createTestUser({ name: 'Direct User', email: 'direct@test.com' });
    await createTestTeamMember(account.teamId, directUser.id, 'editor');

    const res = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(ownerToken),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { members: MemberResponse[] };

    const directMember = body.members.find((member) => member.userId === directUser.id);
    expect(directMember).toBeDefined();
    expect(directMember!.source).toBe('direct');
    expect(directMember!.role).toBe('editor');
  });

  test('returns both org and direct members together', async () => {
    const { user: owner, org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Add direct viewer
    const viewer = await createTestUser({ name: 'Viewer', email: 'viewer@test.com' });
    await createTestTeamMember(account.teamId, viewer.id, 'viewer');

    const res = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(ownerToken),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { members: MemberResponse[] };
    expect(body.members.length).toBe(2);

    const sources = body.members.map((member) => member.source).sort();
    expect(sources).toEqual(['direct', 'organization']);
  });

  test('viewer can list members', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Create viewer with direct access
    const viewerUser = await createTestUser({ name: 'Viewer', email: 'viewer@test.com' });
    await createTestTeamMember(account.teamId, viewerUser.id, 'viewer');
    const viewerToken = await createTestSession(viewerUser.id);

    const res = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(viewerToken),
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/accounts/:accountId/members/:userId
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/accounts/:accountId/members/:userId', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/fake-id/members/fake-user', {
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
  });

  test('returns 403 when non-owner tries to revoke', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Create editor with direct access
    const editorUser = await createTestUser({ name: 'Editor', email: 'editor@test.com' });
    await createTestTeamMember(account.teamId, editorUser.id, 'editor');
    const editorToken = await createTestSession(editorUser.id);

    // Create viewer to try to remove
    const viewerUser = await createTestUser({ name: 'Viewer', email: 'viewer@test.com' });
    await createTestTeamMember(account.teamId, viewerUser.id, 'viewer');

    const res = await app.request(`/api/v1/accounts/${account.id}/members/${viewerUser.id}`, {
      method: 'DELETE',
      headers: bearerHeader(editorToken),
    });

    expect(res.status).toBe(403);
  });

  test('owner can remove a direct team member', async () => {
    const { user: owner, org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Add direct member
    const directUser = await createTestUser({ name: 'Direct User', email: 'direct@test.com' });
    await createTestTeamMember(account.teamId, directUser.id, 'editor');

    const res = await app.request(`/api/v1/accounts/${account.id}/members/${directUser.id}`, {
      method: 'DELETE',
      headers: bearerHeader(ownerToken),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify member is gone
    const listRes = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(ownerToken),
    });
    const listBody = (await listRes.json()) as { members: MemberResponse[] };
    const removed = listBody.members.find((member) => member.userId === directUser.id);
    expect(removed).toBeUndefined();
  });

  test('returns 400 when trying to remove an org-level member', async () => {
    const { user: owner, org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // The owner is an org-level member — cannot be removed at account level
    const res = await app.request(`/api/v1/accounts/${account.id}/members/${owner.id}`, {
      method: 'DELETE',
      headers: bearerHeader(ownerToken),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  test('returns 404 when user is not a direct member', async () => {
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    const nonMember = await createTestUser({ name: 'Non-member', email: 'none@test.com' });

    const res = await app.request(`/api/v1/accounts/${account.id}/members/${nonMember.id}`, {
      method: 'DELETE',
      headers: bearerHeader(ownerToken),
    });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/accounts/:accountId/members/:userId/access
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/accounts/:accountId/members/:userId/access', () => {
  function patchAccess(
    accountId: string,
    userId: string,
    token: string,
    body: Record<string, unknown>
  ) {
    return app.request(`/api/v1/accounts/${accountId}/members/${userId}/access`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/fake-id/members/fake-user/access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'workspace', role: 'editor' }),
    });

    expect(res.status).toBe(401);
  });

  test('returns 403 when non-owner tries to change access', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Create editor with direct access
    const editorUser = await createTestUser({ name: 'Editor', email: 'editor@test.com' });
    await createTestTeamMember(account.teamId, editorUser.id, 'editor');
    const editorToken = await createTestSession(editorUser.id);

    // Create a target user as direct member
    const targetUser = await createTestUser({ name: 'Target', email: 'target@test.com' });
    await createTestTeamMember(account.teamId, targetUser.id, 'viewer');

    const res = await patchAccess(account.id, targetUser.id, editorToken, {
      target: 'workspace',
      role: 'editor',
    });

    expect(res.status).toBe(403);
  });

  test('returns 400 when target is account but no targetAccountId', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    const targetUser = await createTestUser({ name: 'Target', email: 'target@test.com' });
    await createTestOrgMember(org.id, targetUser.id, 'editor');

    const res = await patchAccess(account.id, targetUser.id, ownerToken, {
      target: 'account',
      role: 'editor',
    });

    expect(res.status).toBe(400);
  });

  test('returns 400 when trying to change owner access', async () => {
    const { user: owner, org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    const res = await patchAccess(account.id, owner.id, ownerToken, {
      target: 'account',
      role: 'editor',
      targetAccountId: account.id,
    });

    expect(res.status).toBe(400);
  });

  test('workspace to account: org member becomes direct team member', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Add user as org-level editor
    const targetUser = await createTestUser({ name: 'Org Editor', email: 'orgeditor@test.com' });
    await createTestOrgMember(org.id, targetUser.id, 'editor');

    const res = await patchAccess(account.id, targetUser.id, ownerToken, {
      target: 'account',
      role: 'editor',
      targetAccountId: account.id,
    });

    expect(res.status).toBe(200);

    // Verify: user should now be a direct member, not org member
    const listRes = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(ownerToken),
    });
    const listBody = (await listRes.json()) as { members: MemberResponse[] };
    const targetMember = listBody.members.find((member) => member.userId === targetUser.id);

    expect(targetMember).toBeDefined();
    expect(targetMember!.source).toBe('direct');
    expect(targetMember!.role).toBe('editor');
  });

  test('account to workspace: direct team member becomes org member', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Add user as direct team member
    const targetUser = await createTestUser({ name: 'Direct User', email: 'direct@test.com' });
    await createTestTeamMember(account.teamId, targetUser.id, 'viewer');

    const res = await patchAccess(account.id, targetUser.id, ownerToken, {
      target: 'workspace',
      role: 'editor',
    });

    expect(res.status).toBe(200);

    // Verify: user should now be an org member, not direct
    const listRes = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(ownerToken),
    });
    const listBody = (await listRes.json()) as { members: MemberResponse[] };
    const targetMember = listBody.members.find((member) => member.userId === targetUser.id);

    expect(targetMember).toBeDefined();
    expect(targetMember!.source).toBe('organization');
    expect(targetMember!.role).toBe('editor');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/accounts/:accountId/members/:userId/role
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/accounts/:accountId/members/:userId/role', () => {
  function patchRole(
    accountId: string,
    userId: string,
    token: string,
    body: Record<string, unknown>
  ) {
    return app.request(`/api/v1/accounts/${accountId}/members/${userId}/role`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/accounts/fake-id/members/fake-user/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'editor' }),
    });

    expect(res.status).toBe(401);
  });

  test('returns 403 when non-owner tries to change role', async () => {
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    const editorUser = await createTestUser({ name: 'Editor', email: 'editor@test.com' });
    await createTestTeamMember(account.teamId, editorUser.id, 'editor');
    const editorToken = await createTestSession(editorUser.id);

    const targetUser = await createTestUser({ name: 'Target', email: 'target@test.com' });
    await createTestTeamMember(account.teamId, targetUser.id, 'viewer');

    const res = await patchRole(account.id, targetUser.id, editorToken, { role: 'editor' });

    expect(res.status).toBe(403);
  });

  test('owner can change direct team member role', async () => {
    const { token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    const targetUser = await createTestUser({ name: 'Viewer', email: 'viewer@test.com' });
    await createTestTeamMember(account.teamId, targetUser.id, 'viewer');

    const res = await patchRole(account.id, targetUser.id, ownerToken, { role: 'editor' });

    expect(res.status).toBe(200);

    // Verify role changed
    const listRes = await app.request(`/api/v1/accounts/${account.id}/members`, {
      method: 'GET',
      headers: bearerHeader(ownerToken),
    });
    const listBody = (await listRes.json()) as { members: MemberResponse[] };
    const targetMember = listBody.members.find((member) => member.userId === targetUser.id);

    expect(targetMember).toBeDefined();
    expect(targetMember!.role).toBe('editor');
  });

  test('returns 400 when trying to change org-level member role at account level', async () => {
    const { org, token: ownerToken } = await createAuthenticatedUserWithOrg();
    const account = await createAccount(ownerToken);

    // Add org member
    const orgUser = await createTestUser({ name: 'Org User', email: 'orguser@test.com' });
    await createTestOrgMember(org.id, orgUser.id, 'editor');

    const res = await patchRole(account.id, orgUser.id, ownerToken, { role: 'viewer' });

    expect(res.status).toBe(400);
  });
});
