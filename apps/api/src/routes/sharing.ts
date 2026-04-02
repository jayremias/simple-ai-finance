import { changeAccessLevelSchema, updateAccountMemberRoleSchema } from '@moneylens/shared';
import { Hono } from 'hono';
import { requireAuth } from '@/middleware/auth';
import { type AccountPermissionVariables, requireAccountAccess } from '@/middleware/permissions';
import {
  changeAccessLevel,
  listAccountMembers,
  removeAccountMember,
  updateAccountMemberRole,
} from '@/services/sharing.service';

const sharing = new Hono<{ Variables: AccountPermissionVariables }>()
  .basePath('/accounts/:accountId/members')
  .use(requireAuth);

// GET /accounts/:accountId/members — List all members with access
sharing.get(
  '/',
  requireAccountAccess('viewer', { from: 'param', name: 'accountId' }),
  async (c) => {
    const accountId = c.get('accountId');
    const members = await listAccountMembers(accountId);
    return c.json({ members });
  }
);

// DELETE /accounts/:accountId/members/:userId — Revoke direct access
sharing.delete(
  '/:userId',
  requireAccountAccess('owner', { from: 'param', name: 'accountId' }),
  async (c) => {
    const accountId = c.get('accountId');
    const targetUserId = c.req.param('userId');

    const result = await removeAccountMember(accountId, targetUserId);

    if ('error' in result) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return c.json({ error: { code: result.code, message: result.error } }, status);
    }

    return c.json({ success: true });
  }
);

// PATCH /accounts/:accountId/members/:userId/access — Change access level
sharing.patch(
  '/:userId/access',
  requireAccountAccess('owner', { from: 'param', name: 'accountId' }),
  async (c) => {
    const accountId = c.get('accountId');
    const targetUserId = c.req.param('userId');

    const parsed = changeAccessLevelSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues[0]?.message ?? 'Invalid input',
          },
        },
        400
      );
    }

    const { target, role, targetAccountId } = parsed.data;
    const result = await changeAccessLevel(accountId, targetUserId, target, role, targetAccountId);

    if ('error' in result) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return c.json({ error: { code: result.code, message: result.error } }, status);
    }

    return c.json({ success: true });
  }
);

// PATCH /accounts/:accountId/members/:userId/role — Change direct member role
sharing.patch(
  '/:userId/role',
  requireAccountAccess('owner', { from: 'param', name: 'accountId' }),
  async (c) => {
    const accountId = c.get('accountId');
    const targetUserId = c.req.param('userId');

    const parsed = updateAccountMemberRoleSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: parsed.error.issues[0]?.message ?? 'Invalid input',
          },
        },
        400
      );
    }

    const { role } = parsed.data;
    const result = await updateAccountMemberRole(accountId, targetUserId, role);

    if ('error' in result) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return c.json({ error: { code: result.code, message: result.error } }, status);
    }

    return c.json({ success: true });
  }
);

export default sharing;
