import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, bearer, organization } from 'better-auth/plugins';
import { and, desc, eq } from 'drizzle-orm';
import { env as rootEnv } from '@/env';
import { db } from '@/lib/db';
import {
  invitation as invitationTable,
  member as memberTable,
  organization as organizationTable,
} from '@/lib/db/schema/organization';
import { teamMember as teamMemberTable } from '@/lib/db/schema/team';
import { sendEmail } from '@/lib/email';
import { env } from './env';
import { ac, editor, owner, viewer } from './permissions';

function parseTrustedOrigins(raw: string): string[] {
  if (raw === '*') return [];
  return raw.split(',').map((o) => o.trim());
}

export const auth = betterAuth({
  appName: 'MoneyLens',
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    ...parseTrustedOrigins(rootEnv.CORS_ORIGINS),
    // React Native / Expo — no Origin header on native requests
    'exp://',
    'exp://**',
    'moneylens://',
    'moneylens://**',
  ],

  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: rootEnv.NODE_ENV === 'production',
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Reset your MoneyLens password',
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password:</p><p><a href="${url}">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Verify your MoneyLens email',
        html: `<p>Hi ${user.name},</p><p>Click the link below to verify your email address:</p><p><a href="${url}">Verify Email</a></p><p>This link expires in 1 hour.</p>`,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
  },

  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret: env.APPLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    freshAge: 60 * 60, // 1 hour — required for account deletion without password
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: 'Confirm MoneyLens account deletion',
          html: `<p>Hi ${user.name},</p><p>You requested to delete your MoneyLens account. Click the link below to confirm:</p><p><a href="${url}">Delete My Account</a></p><p>This action is permanent and cannot be undone. If you didn't request this, ignore this email.</p>`,
        });
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Insert org + member directly — bypasses Better Auth's HTTP layer
          // (which would fail CSRF checks for server-side calls without Origin).
          const orgId = crypto.randomUUID();
          await db.insert(organizationTable).values({
            id: orgId,
            name: 'Personal',
            slug: `personal-${user.id}`,
            createdAt: new Date(),
          });
          await db.insert(memberTable).values({
            id: crypto.randomUUID(),
            organizationId: orgId,
            userId: user.id,
            role: 'owner',
            createdAt: new Date(),
          });
          const { seedDefaultCategories } = await import('@/services/categories.service');
          await seedDefaultCategories(orgId);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (session.activeOrganizationId) return { data: session };

          try {
            const [personalMember] = await db
              .select()
              .from(memberTable)
              .where(eq(memberTable.userId, session.userId))
              .limit(1);

            return {
              data: {
                ...session,
                activeOrganizationId: personalMember?.organizationId ?? null,
              },
            };
          } catch (error) {
            console.error('Failed to resolve activeOrganizationId for session:', error);
            return { data: { ...session, activeOrganizationId: null } };
          }
        },
      },
    },
  },

  plugins: [
    expo(),
    bearer(),
    admin({
      defaultRole: 'user',
    }),
    organization({
      ac,
      roles: { owner, editor, viewer },
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      async sendInvitationEmail({ invitation, organization: inviteOrg, inviter }) {
        // TODO: Send actual invitation email (deferred to separate issue)
        console.log(
          `[invite] ${inviter.user.name} invited ${invitation.email} to ${inviteOrg.name} as ${invitation.role}`
        );

        try {
          const { createNotificationForEmail } = await import('@/services/notification.service');
          await createNotificationForEmail({
            email: invitation.email,
            type: 'invitation_received',
            title: 'New Invitation',
            message: `${inviter.user.name} invited you to ${inviteOrg.name}`,
            navigateTo: 'Invitations',
            metadata: JSON.stringify({
              invitationId: invitation.id,
              organizationId: inviteOrg.id,
            }),
          });
        } catch (notificationError) {
          console.error('Failed to create invitation notification:', notificationError);
        }
      },
      teams: {
        enabled: true,
      },
      organizationHooks: {
        afterAddTeamMember: async ({ teamMember, team, user }) => {
          // When BA adds a team member (e.g. via accept-invitation with teamId),
          // look up the invitation to determine the intended role and apply it.
          const [matchedInvitation] = await db
            .select()
            .from(invitationTable)
            .where(and(eq(invitationTable.teamId, team.id), eq(invitationTable.email, user.email)))
            .orderBy(desc(invitationTable.createdAt))
            .limit(1);

          const role = matchedInvitation?.role ?? 'viewer';

          await db
            .update(teamMemberTable)
            .set({ role })
            .where(eq(teamMemberTable.id, teamMember.id));
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
