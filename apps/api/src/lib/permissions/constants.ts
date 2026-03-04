// ---------------------------------------------------------------------------
// Platform Permissions — admin-only operations
// ---------------------------------------------------------------------------

export const PLATFORM_PERMISSIONS = {
  'user.list': 'List all users',
  'user.read': 'View any user profile',
  'user.ban': 'Ban or unban a user',
  'user.delete': 'Delete any user account',
  'user.set-role': "Change a user's platform role",
  'user.impersonate': 'Impersonate another user',
} as const;

export type PlatformPermission = keyof typeof PLATFORM_PERMISSIONS;

export const PLATFORM_ROLES = {
  admin: ['user.list', 'user.read', 'user.ban', 'user.delete', 'user.set-role', 'user.impersonate'],
  user: [],
} as const satisfies Record<string, readonly PlatformPermission[]>;

export type PlatformRole = keyof typeof PLATFORM_ROLES;

// ---------------------------------------------------------------------------
// Account Permissions — now handled by Better Auth access control
// See: apps/api/src/lib/auth/permissions.ts (owner, editor, viewer roles)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function platformRoleHasPermission(role: string, permission: PlatformPermission): boolean {
  const permissions = PLATFORM_ROLES[role as PlatformRole];
  if (!permissions) return false;
  return (permissions as readonly string[]).includes(permission);
}
