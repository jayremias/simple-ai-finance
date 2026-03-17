import { relations } from 'drizzle-orm';
import { account, session, user } from './auth';
import { category } from './category';
import { financialAccount } from './financial-account';
import { invitation, member, organization } from './organization';
import { tag } from './tag';
import { team, teamMember } from './team';
import { transaction, transactionTag } from './transaction';
import { userProfile } from './user-profile';

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  teamMembers: many(teamMember),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  teams: many(team),
  financialAccounts: many(financialAccount),
  categories: many(category),
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
  organization: one(organization, {
    fields: [category.organizationId],
    references: [organization.id],
  }),
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: 'parentChild',
  }),
  children: many(category, { relationName: 'parentChild' }),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  members: many(teamMember),
  financialAccount: one(financialAccount, {
    fields: [team.id],
    references: [financialAccount.teamId],
  }),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}));

export const financialAccountRelations = relations(financialAccount, ({ one }) => ({
  team: one(team, {
    fields: [financialAccount.teamId],
    references: [team.id],
  }),
  organization: one(organization, {
    fields: [financialAccount.organizationId],
    references: [organization.id],
  }),
}));

export const tagRelations = relations(tag, ({ one, many }) => ({
  organization: one(organization, {
    fields: [tag.organizationId],
    references: [organization.id],
  }),
  transactionTags: many(transactionTag),
}));

export const transactionRelations = relations(transaction, ({ one, many }) => ({
  organization: one(organization, {
    fields: [transaction.organizationId],
    references: [organization.id],
  }),
  account: one(team, {
    fields: [transaction.accountId],
    references: [team.id],
  }),
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  transactionTags: many(transactionTag),
}));

export const transactionTagRelations = relations(transactionTag, ({ one }) => ({
  transaction: one(transaction, {
    fields: [transactionTag.transactionId],
    references: [transaction.id],
  }),
  tag: one(tag, {
    fields: [transactionTag.tagId],
    references: [tag.id],
  }),
}));
