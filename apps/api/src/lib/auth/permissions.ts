import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/organization/access';

const statement = {
  ...defaultStatements,
  account: ['read', 'update', 'archive', 'delete'],
  transaction: ['list', 'read', 'create', 'update', 'delete', 'split'],
  receipt: ['upload', 'extract'],
  statement: ['upload', 'read'],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  account: ['read', 'update', 'archive', 'delete'],
  transaction: ['list', 'read', 'create', 'update', 'delete', 'split'],
  receipt: ['upload', 'extract'],
  statement: ['upload', 'read'],
  ...adminAc.statements,
});

export const editor = ac.newRole({
  account: ['read', 'update'],
  transaction: ['list', 'read', 'create', 'update', 'delete', 'split'],
  receipt: ['upload', 'extract'],
  statement: ['upload', 'read'],
});

export const viewer = ac.newRole({
  account: ['read'],
  transaction: ['list', 'read'],
  statement: ['read'],
});
