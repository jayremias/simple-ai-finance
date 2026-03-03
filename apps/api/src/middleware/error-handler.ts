import { env } from "@/env";
import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details?: unknown;
		request_id?: string;
	};
}

function buildErrorResponse(
	c: Context,
	status: number,
	code: string,
	message: string,
	details?: unknown,
): Response {
	const requestId = c.get("requestId") as string | undefined;

	const body: ErrorResponse = {
		error: {
			code,
			message,
			...(details ? { details } : {}),
			...(requestId ? { request_id: requestId } : {}),
		},
	};

	return c.json(body, status as 400);
}

export const onError: ErrorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return buildErrorResponse(
			c,
			err.status,
			httpStatusToCode(err.status),
			err.message || "An error occurred",
		);
	}

	if (err instanceof ZodError) {
		return buildErrorResponse(c, 400, "VALIDATION_ERROR", "Validation failed", {
			issues: err.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		});
	}

	// Unknown errors — log full details, return generic message in production
	console.error("[ERROR]", err);

	const message =
		env.NODE_ENV === "production"
			? "Internal server error"
			: err.message || "Internal server error";

	return buildErrorResponse(c, 500, "INTERNAL_ERROR", message);
};

export const notFound: NotFoundHandler = (c) => {
	return buildErrorResponse(c, 404, "NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`);
};

function httpStatusToCode(status: number): string {
	const codes: Record<number, string> = {
		400: "BAD_REQUEST",
		401: "UNAUTHORIZED",
		403: "FORBIDDEN",
		404: "NOT_FOUND",
		405: "METHOD_NOT_ALLOWED",
		408: "REQUEST_TIMEOUT",
		409: "CONFLICT",
		422: "UNPROCESSABLE_ENTITY",
		429: "RATE_LIMIT_EXCEEDED",
	};
	return codes[status] ?? "INTERNAL_ERROR";
}
