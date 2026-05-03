/**
 * Role-level hierarchy helpers.
 *
 * Two role spaces exist in the app:
 * - **Org roles** (`owner | editor | member`) — Better Auth organization member roles.
 * - **Account roles** (`owner | editor | viewer`) — financial-account team-member roles.
 *
 * They share the same hierarchy levels (3 / 2 / 1) but use different leaf names
 * (`member` vs `viewer`), so the two helpers are kept separate.
 */

const ORG_ROLE_LEVEL = { owner: 3, editor: 2, member: 1 } as const;
const ACCOUNT_ROLE_LEVEL = { owner: 3, editor: 2, viewer: 1 } as const;

export type OrgRole = keyof typeof ORG_ROLE_LEVEL;
export type AccountRole = keyof typeof ACCOUNT_ROLE_LEVEL;

export function hasMinimumOrgRole(role: string, minimum: OrgRole): boolean {
  const userLevel = ORG_ROLE_LEVEL[role as OrgRole] ?? 0;
  return userLevel >= ORG_ROLE_LEVEL[minimum];
}

export function hasMinimumAccountRole(role: AccountRole, minimum: AccountRole): boolean {
  return ACCOUNT_ROLE_LEVEL[role] >= ACCOUNT_ROLE_LEVEL[minimum];
}
