import type {
	AccountPermission,
	AccountRole,
	PlatformPermission,
} from "@/lib/permissions/constants";
import {
	type PLATFORM_ROLES,
	accountRoleHasPermission,
	platformRoleHasPermission,
} from "@/lib/permissions/constants";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { AuthVariables } from "./auth";

// ---------------------------------------------------------------------------
// Platform permission middleware
// ---------------------------------------------------------------------------

/**
 * Checks that the authenticated user's platform role includes the given
 * permission. Returns 401 if unauthenticated, 403 if the role lacks access.
 *
 * Zero DB queries — resolves entirely from the session context.
 * Must be used after `sessionMiddleware` + `requireAuth`.
 */
export function requirePlatformPermission(permission: PlatformPermission) {
	return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
		const user = c.get("user");
		if (!user) {
			return c.json(
				{
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				401,
			);
		}

		const role = (user.role ?? "user") as keyof typeof PLATFORM_ROLES;

		if (!platformRoleHasPermission(role, permission)) {
			return c.json(
				{
					error: {
						code: "FORBIDDEN",
						message: "Insufficient permissions",
					},
				},
				403,
			);
		}

		await next();
	});
}

// ---------------------------------------------------------------------------
// Account permission middleware (stubbed — requires financial_account table)
// ---------------------------------------------------------------------------

/**
 * Describes where to extract the target `accountId` from the request.
 *
 * - `param`  — URL parameter (default: `"id"`)
 * - `body`   — JSON request body field (default: `"accountId"`)
 * - `lookup` — DB lookup via a child table's `:id` param (e.g. transaction → account_id)
 */
export type AccountIdSource =
	| { from: "param"; name?: string }
	| { from: "body"; name?: string }
	| { from: "lookup"; table: "transaction" | "statement" };

export type AccountPermissionVariables = AuthVariables & {
	accountId: string;
	accountRole: AccountRole;
};

/**
 * Checks that the authenticated user has the given permission on the target
 * financial account. Sets `c.var.accountId` and `c.var.accountRole` for
 * downstream handlers.
 *
 * **Stubbed** — `resolveAccountId` and `resolveAccountRole` throw until the
 * `financial_account` and `account_share` tables are created.
 * See `docs/plans/2026-03-02-permissions-design.md` §5–6 for the full flow.
 */
export function requireAccountPermission(
	permission: AccountPermission,
	source: AccountIdSource = { from: "param", name: "id" },
) {
	return createMiddleware<{ Variables: AccountPermissionVariables }>(async (c, next) => {
		const user = c.get("user");
		if (!user) {
			return c.json(
				{
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				401,
			);
		}

		// 1. Extract accountId based on source config
		const accountId = await resolveAccountId(c, source);
		if (!accountId) {
			return c.json(
				{
					error: {
						code: "BAD_REQUEST",
						message: "Account ID required",
					},
				},
				400,
			);
		}

		// 2. Determine role: owner or shared
		const role = await resolveAccountRole(user.id, accountId);
		if (!role) {
			return c.json(
				{
					error: {
						code: "FORBIDDEN",
						message: "No access to this account",
					},
				},
				403,
			);
		}

		// 3. Check permission
		if (!accountRoleHasPermission(role, permission)) {
			return c.json(
				{
					error: {
						code: "FORBIDDEN",
						message: "Insufficient permissions",
					},
				},
				403,
			);
		}

		// 4. Set context for downstream handlers
		c.set("accountId", accountId);
		c.set("accountRole", role);

		await next();
	});
}

// ---------------------------------------------------------------------------
// Helpers — stubbed until financial_account / account_share tables exist
// ---------------------------------------------------------------------------

/**
 * Extracts the target `accountId` from the request based on the source config.
 *
 * TODO: Implement `lookup` case when transaction/statement tables exist.
 * The lookup case will query the child table by its `:id` param and return
 * the parent `account_id` column.
 */
async function resolveAccountId(c: Context, source: AccountIdSource): Promise<string | null> {
	switch (source.from) {
		case "param":
			return c.req.param(source.name ?? "id") ?? null;

		case "body": {
			const body = await c.req.json();
			return body[source.name ?? "accountId"] ?? null;
		}

		case "lookup":
			// TODO: Query `source.table` by `:id` param to get `account_id`.
			// Example for transactions:
			//   const tx = await db.query.transaction.findFirst({
			//     where: (t, { eq }) => eq(t.id, c.req.param("id")),
			//     columns: { accountId: true },
			//   });
			//   return tx?.accountId ?? null;
			throw new Error(
				`Account ID lookup from "${source.table}" table is not yet implemented. Requires financial_account and related tables.`,
			);
	}
}

/**
 * Determines the user's role on the given financial account.
 * Returns `"owner"` if the user created the account, the shared role
 * (`"editor"` | `"viewer"`) if an `account_share` row exists, or `null`.
 *
 * TODO: Implement when `financial_account` and `account_share` schemas exist.
 * See `docs/plans/2026-03-02-permissions-design.md` §5.2 for the full flow.
 */
async function resolveAccountRole(
	_userId: string,
	_accountId: string,
): Promise<AccountRole | null> {
	// TODO: Implement ownership + sharing lookup:
	//
	// 1. Check ownership (most common path):
	//   const account = await db.query.financialAccount.findFirst({
	//     where: (t, { eq, and }) => and(eq(t.id, accountId), eq(t.userId, userId)),
	//     columns: { id: true },
	//   });
	//   if (account) return "owner";
	//
	// 2. Check shared access:
	//   const share = await db.query.accountShare.findFirst({
	//     where: (t, { eq, and }) =>
	//       and(eq(t.accountId, accountId), eq(t.userId, userId)),
	//     columns: { role: true },
	//   });
	//   if (share) return share.role as AccountRole;
	//
	// 3. No access:
	//   return null;

	throw new Error(
		"Account role resolution is not yet implemented. " +
			"Requires financial_account and account_share tables.",
	);
}
