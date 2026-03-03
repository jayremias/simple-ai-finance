import { type Session, auth } from "@/lib/auth";
import { createMiddleware } from "hono/factory";

export type AuthVariables = {
	user: Session["user"] | null;
	session: Session["session"] | null;
};

/**
 * Populates user/session on every request from cookies or bearer token.
 * Does NOT block unauthenticated requests — use requireAuth for that.
 */
export const sessionMiddleware = createMiddleware<{
	Variables: AuthVariables;
}>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set("user", session?.user ?? null);
	c.set("session", session?.session ?? null);

	await next();
});

/**
 * Blocks unauthenticated requests with 401.
 * Must be used after sessionMiddleware.
 */
export const requireAuth = createMiddleware<{
	Variables: AuthVariables;
}>(async (c, next) => {
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

	await next();
});
