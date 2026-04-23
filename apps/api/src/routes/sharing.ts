import { inviteToAccountSchema } from '@moneylens/shared/schemas';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth';
import type { OrgMembershipVariables } from '@/middleware/organization';
import { requireActiveOrg, requireOrgMembership } from '@/middleware/organization';
import { type AccountPermissionVariables, requireAccountAccess } from '@/middleware/permissions';
import {
  AccountNotFoundError,
  AlreadyHasAccessError,
  acceptInvitation,
  InvitationNotFoundError,
  inviteUserToAccount,
  listAccountMembers,
  MemberNotFoundError,
  revokeAccountAccess,
  SelfInviteError,
} from '@/services/sharing.service';

const revokeAccessSchema = z.object({
  userId: z.string().min(1),
});

const sharing = new Hono<{ Variables: OrgMembershipVariables & AccountPermissionVariables }>()
  .basePath('/sharing')
  .use(requireAuth);

// POST /sharing/invite — Invite a user to a specific account
sharing.post('/invite', requireActiveOrg, requireOrgMembership('owner'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const inviter = c.get('user');
  if (!inviter) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }

  const body = await c.req.json();
  const parsed = inviteToAccountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  try {
    const result = await inviteUserToAccount(
      organizationId,
      parsed.data.accountId,
      parsed.data.email,
      parsed.data.role,
      inviter.id,
      c.req.raw.headers
    );

    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
    }
    if (error instanceof SelfInviteError) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot invite yourself' } }, 400);
    }
    if (error instanceof AlreadyHasAccessError) {
      return c.json(
        { error: { code: 'CONFLICT', message: 'User already has access to this account' } },
        409
      );
    }
    throw error;
  }
});

// POST /sharing/invitations/:id/accept — Accept a pending invitation
sharing.post('/invitations/:id/accept', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }

  const invitationId = c.req.param('id');

  try {
    const result = await acceptInvitation(invitationId, user.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof InvitationNotFoundError) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Invitation not found' } }, 404);
    }
    throw error;
  }
});

// DELETE /sharing/:accountId — Revoke a user's access to an account
sharing.delete('/:accountId', requireActiveOrg, requireOrgMembership('owner'), async (c) => {
  const organizationId = c.get('organizationId') as string;
  const accountId = c.req.param('accountId');

  const body = await c.req.json();
  const parsed = revokeAccessSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  try {
    const result = await revokeAccountAccess(accountId, parsed.data.userId, organizationId);
    return c.json(result);
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
    }
    if (error instanceof MemberNotFoundError) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'User is not a member of this account' } },
        404
      );
    }
    throw error;
  }
});

// GET /sharing/:accountId/members — List members with access to an account
sharing.get(
  '/:accountId/members',
  requireAccountAccess('viewer', { from: 'param', name: 'accountId' }),
  async (c) => {
    const accountId = c.get('accountId');
    const members = await listAccountMembers(accountId);
    if (!members) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
    }
    return c.json({ data: members });
  }
);

export default sharing;
