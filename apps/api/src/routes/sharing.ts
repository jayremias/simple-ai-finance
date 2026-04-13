import { inviteToAccountSchema } from '@moneylens/shared/schemas';
import { Hono } from 'hono';
import { requireAuth } from '@/middleware/auth';
import type { OrgMembershipVariables } from '@/middleware/organization';
import { requireActiveOrg, requireOrgMembership } from '@/middleware/organization';
import {
  AccountNotFoundError,
  acceptInvitation,
  InvitationNotFoundError,
  inviteUserToAccount,
} from '@/services/sharing.service';

const sharing = new Hono<{ Variables: OrgMembershipVariables }>()
  .basePath('/sharing')
  .use(requireAuth);

// POST /sharing/invite — Invite a user to a specific account
sharing.post('/invite', requireActiveOrg, requireOrgMembership('owner'), async (c) => {
  const organizationId = c.get('organizationId') as string;

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
    const invitation = await inviteUserToAccount(
      organizationId,
      parsed.data.accountId,
      parsed.data.email,
      parsed.data.role,
      c.req.raw.headers
    );

    return c.json(invitation, 201);
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);
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

export default sharing;
