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
// Account Permissions — per-financial-account operations
// ---------------------------------------------------------------------------

export const ACCOUNT_PERMISSIONS = {
  'account.read': 'View account details and balance',
  'account.update': 'Edit account metadata',
  'account.archive': 'Archive or unarchive an account',
  'account.delete': 'Delete an account permanently',
  'account.share': 'Invite another user',
  'account.unshare': "Revoke a user's access",
  'account.share.list': 'View who has access',
  'transaction.list': 'List transactions for the account',
  'transaction.read': 'View a single transaction',
  'transaction.create': 'Add a transaction',
  'transaction.update': 'Edit a transaction',
  'transaction.delete': 'Delete a transaction',
  'transaction.split': 'Split a transaction into categories',
  'receipt.upload': 'Get pre-signed URL for receipt upload',
  'receipt.extract': 'Trigger AI extraction',
  'statement.upload': 'Upload a bank statement PDF',
  'statement.read': 'View statement processing results',
} as const;

export type AccountPermission = keyof typeof ACCOUNT_PERMISSIONS;

export const ACCOUNT_ROLES = {
  owner: [
    'account.read',
    'account.update',
    'account.archive',
    'account.delete',
    'account.share',
    'account.unshare',
    'account.share.list',
    'transaction.list',
    'transaction.read',
    'transaction.create',
    'transaction.update',
    'transaction.delete',
    'transaction.split',
    'receipt.upload',
    'receipt.extract',
    'statement.upload',
    'statement.read',
  ],
  editor: [
    'account.read',
    'account.share.list',
    'transaction.list',
    'transaction.read',
    'transaction.create',
    'transaction.update',
    'transaction.delete',
    'transaction.split',
    'receipt.upload',
    'receipt.extract',
    'statement.upload',
    'statement.read',
  ],
  viewer: [
    'account.read',
    'account.share.list',
    'transaction.list',
    'transaction.read',
    'statement.read',
  ],
} as const satisfies Record<string, readonly AccountPermission[]>;

export type AccountRole = keyof typeof ACCOUNT_ROLES;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function platformRoleHasPermission(role: string, permission: PlatformPermission): boolean {
  const permissions = PLATFORM_ROLES[role as PlatformRole];
  if (!permissions) return false;
  return (permissions as readonly string[]).includes(permission);
}

export function accountRoleHasPermission(role: string, permission: AccountPermission): boolean {
  const permissions = ACCOUNT_ROLES[role as AccountRole];
  if (!permissions) return false;
  return (permissions as readonly string[]).includes(permission);
}
