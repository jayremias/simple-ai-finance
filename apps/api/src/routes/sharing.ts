import { inviteToAccountSchema } from '@moneylens/shared/schemas';
import { Hono } from 'hono';
import { z } from 'zod';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import { requireAuth } from '@/middleware/auth';
import type { OrgMembershipVariables } from '@/middleware/organization';
import { requireActiveOrg, requireOrgMembership } from '@/middleware/organization';
import { type AccountPermissionVariables, requireAccountAccess } from '@/middleware/permissions';
import { validate } from '@/middleware/validate';
import {
  acceptInvitation,
  inviteUserToAccount,
  listAccountMembers,
  revokeAccountAccess,
} from '@/services/sharing.service';

const revokeAccessSchema = z.object({
  userId: z.string().min(1),
});

const sharing = new Hono<{ Variables: OrgMembershipVariables & AccountPermissionVariables }>()
  .basePath('/sharing')
  .use(requireAuth);

// POST /sharing/invite — Invite a user to a specific account
sharing.post(
  '/invite',
  requireActiveOrg,
  requireOrgMembership('owner'),
  validate('json', inviteToAccountSchema),
  async (c) => {
    const organizationId = c.get('organizationId') as string;
    const inviter = c.get('user');
    if (!inviter) throw new UnauthorizedError('Not authenticated');

    const { accountId, email, role } = c.req.valid('json');
    const result = await inviteUserToAccount(
      organizationId,
      accountId,
      email,
      role,
      inviter.id,
      c.req.raw.headers
    );

    return c.json(result, 201);
  }
);

// POST /sharing/invitations/:id/accept — Accept a pending invitation
sharing.post('/invitations/:id/accept', async (c) => {
  const user = c.get('user');
  if (!user) throw new UnauthorizedError('Not authenticated');

  const result = await acceptInvitation(c.req.param('id'), user.id);
  return c.json(result);
});

// DELETE /sharing/:accountId — Revoke a user's access to an account
sharing.delete(
  '/:accountId',
  requireActiveOrg,
  requireOrgMembership('owner'),
  validate('json', revokeAccessSchema),
  async (c) => {
    const organizationId = c.get('organizationId') as string;
    const accountId = c.req.param('accountId');
    const { userId } = c.req.valid('json');

    const result = await revokeAccountAccess(accountId, userId, organizationId);
    return c.json(result);
  }
);

// GET /sharing/:accountId/members — List members with access to an account
sharing.get(
  '/:accountId/members',
  requireAccountAccess('viewer', { from: 'param', name: 'accountId' }),
  async (c) => {
    const accountId = c.get('accountId');
    const members = await listAccountMembers(accountId);
    if (!members) throw new NotFoundError('Account not found');
    return c.json({ data: members });
  }
);

export default sharing;
