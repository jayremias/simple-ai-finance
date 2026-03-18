# Code Review Fixes — `apps/api`

Findings from a 5-agent security & pattern compliance review of the API codebase.
Each task is self-contained: fix, test, verify, move on.

---

## How to use this document

- Work through tasks in order (priority is already sorted)
- Each task has: **Problem**, **Why it matters**, **Files**, **Fix**, and **Verify**
- Mark `[ ]` → `[x]` as each task is completed
- After each fix, run the verify step before moving to the next

---

## Critical — Security

### Task 1: Rate limiter uses spoofable `X-Forwarded-For` header
- [ ] Fixed
- [ ] Verified

**Problem:** `getClientKey()` trusts `X-Forwarded-For` directly. Any client can bypass all rate limiting — including `sensitiveAuthLimiter` on password reset — by rotating this header value.

**Files:**
- `apps/api/src/middleware/rate-limiter.ts:14-18`

**Fix:**
- Add a `TRUSTED_PROXY` or `TRUST_PROXY` env var (Zod-validated in `src/env.ts`)
- When behind a trusted proxy: use `X-Forwarded-For` (last entry, not first — proxies append)
- When not behind a proxy: use the socket/connection IP directly
- Fallback to `'unknown'` only as last resort
- Document the proxy trust assumption in a code comment

**Verify:**
- `bun run lint`
- Write a unit test or manual test: send a request with a spoofed `X-Forwarded-For` header and confirm the rate limiter uses the correct IP source based on the env config

---

### Task 2: CORS defaults to wildcard `*`
- [ ] Fixed
- [ ] Verified

**Problem:** `CORS_ORIGINS` defaults to `'*'` in `src/env.ts`. If unset in production, the API accepts requests from any origin. The `console.warn` is not a sufficient safety control.

**Files:**
- `apps/api/src/env.ts:6`

**Fix:**
- Remove the `.default('*')` — make `CORS_ORIGINS` required (no default)
- Or: add a Zod `.refine()` that rejects `*` when `NODE_ENV === 'production'`
- Update `.env.example` to show the expected format
- Keep the `console.warn` for dev convenience but make prod fail hard at startup

**Verify:**
- `bun run lint`
- Start the server without `CORS_ORIGINS` set → should fail with a clear error
- Start with `CORS_ORIGINS=http://localhost:3000` → should work

---

### Task 3: Banned users not blocked on existing sessions
- [ ] Fixed
- [ ] Verified

**Problem:** The `user` schema has `banned` and `banExpires` fields, but `requireAuth` middleware does not check them. A banned user with a valid session (up to 7 days) can keep making authenticated requests.

**Files:**
- `apps/api/src/middleware/auth.ts:13-24`

**Fix:**
- In `requireAuth`, after confirming `user` exists, check `user.banned`
- If `banned === true` and (`banExpires` is null or `banExpires > now`), return 403 with `{ error: { code: 'FORBIDDEN', message: 'Account suspended' } }`
- If `banExpires` is in the past, the ban has expired — allow the request

**Verify:**
- `bun run lint`
- Write a test: create a user, set `banned = true`, make an authenticated request → expect 403
- Write a test: create a user, set `banned = true` with expired `banExpires` → expect 200

---

## Critical — CLAUDE.md Violations

### Task 4: Raw `process.env` access in 3 locations
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md says *"never read `process.env` directly"*. Three files read `process.env` instead of using the Zod-validated `env` object.

**Files:**
- `apps/api/drizzle.config.ts:8` → `process.env.DATABASE_URL`
- `apps/api/src/middleware/rate-limiter.ts:9` → `process.env.NODE_ENV`
- `apps/api/src/index.ts:50` → `process.env.NODE_ENV`

**Fix:**
- `drizzle.config.ts`: add an inline `z.object({ DATABASE_URL: z.string().url() }).parse(process.env)` at the top (cannot import from `src/` since it's outside the source tree)
- `rate-limiter.ts`: import `env` from `@/env` and use `env.NODE_ENV`
- `index.ts`: use the already-imported `env.NODE_ENV` instead of `process.env.NODE_ENV`

**Verify:**
- `bun run lint`
- `bun run build` (TypeScript compilation passes)
- `bun run test` (existing tests still pass)

---

### Task 5: Missing `updated_at` on `organization` and `member` tables; `team.updatedAt` nullable
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md says *"All tables include `created_at` and `updated_at` timestamps"*. Three tables violate this.

**Files:**
- `apps/api/src/lib/db/schema/organization.ts:4-34` → `organization` and `member` missing `updatedAt`
- `apps/api/src/lib/db/schema/team.ts:14` → `updatedAt` is nullable with no `.$onUpdate()`

**Fix:**
- Check if Better Auth constrains the `organization` and `member` schemas. If so, add a comment documenting the exception. If not, add `updatedAt` column
- For `team.ts`: change to `timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull()`
- Also fix missing `.defaultNow()` on `createdAt` in `organization`, `member`, and `team` tables
- Run `bun run db:push` to sync schema to local dev DB

**Verify:**
- `bun run lint`
- `bun run db:push` succeeds
- `bun run test` (existing tests still pass — `truncateAll` handles the new columns)

---

### Task 6: Business logic (DB query) inside `POST /accounts` route handler
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md says *"No business logic in routes"*. The `POST /accounts` handler directly queries the `member` table for org membership/role check, importing Drizzle operators into the route file.

**Files:**
- `apps/api/src/routes/accounts.ts:42-57`
- `apps/api/src/services/accounts.service.ts` (destination for the logic)

**Fix:**
- Move the org membership + role check into `accounts.service.ts` as a function like `verifyOrgMemberRole(userId, organizationId, allowedRoles)`
- Or move the check into the `createAccount` service function itself
- Remove `drizzle-orm` imports (`and`, `eq`) and `member` schema import from `accounts.ts`
- Route should only: validate input → call service → return response

**Verify:**
- `bun run lint`
- `bun run test`
- Manual test: `POST /api/v1/accounts` with valid and invalid org membership → correct 403/201

---

### Task 7: `requireAccountAccess` middleware exists but is bypassed
- [ ] Fixed
- [ ] Verified

**Problem:** `middleware/permissions.ts` exports `requireAccountAccess` — purpose-built for account authorization. But `GET /:id`, `PATCH /:id`, and `DELETE /:id` manually call `resolveUserAccountRole()` instead, creating 3x duplicated auth logic.

**Files:**
- `apps/api/src/routes/accounts.ts:119, 141, 207`
- `apps/api/src/middleware/permissions.ts`

**Fix:**
- Use `requireAccountAccess({ from: 'param', name: 'id' }, ['owner', 'editor', 'viewer'])` as middleware on `GET /:id`
- Use appropriate role arrays for `PATCH` and `DELETE`
- Access `c.var.accountRole` and `c.var.accountId` in handlers instead of manual resolution
- Remove the manual `resolveUserAccountRole()` calls from each handler

**Verify:**
- `bun run lint`
- `bun run test`
- Manual test: GET/PATCH/DELETE with owner, editor, viewer, and no-access users → correct responses

---

## Important — Pattern Issues

### Task 8: Duplicate CORS + rate limiter on auth routes
- [ ] Fixed
- [ ] Verified

**Problem:** Both `index.ts:21-35` and `routes/auth.ts:9-23` register CORS, `authLimiter`, and the Better Auth handler for `/api/auth/*`. Every auth request passes through middleware twice.

**Files:**
- `apps/api/src/index.ts:21-35`
- `apps/api/src/routes/auth.ts:9-23`

**Fix:**
- Pick one registration point. Recommendation: let `routes/auth.ts` own all auth middleware
- Remove the CORS, `authLimiter`, `sensitiveAuthLimiter`, and `app.on(...)` handler from `index.ts`
- Move `sensitiveAuthLimiter` into `routes/auth.ts` if not already there
- Keep `index.ts` clean: just `app.route('/', authRoutes)`

**Verify:**
- `bun run lint`
- `bun run test`
- Manual test: auth endpoints still work (sign-in, sign-up, password reset)
- Confirm rate limiting still applies (single layer, not double)

---

### Task 9: URL params (`:id`) not validated with Zod
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md says *"Use Zod for all validation — query params, URL params"*. The `:id` path parameter is not validated as UUID before being passed to DB queries.

**Files:**
- `apps/api/src/routes/accounts.ts:117, 139, 205`

**Fix:**
- Create a shared `uuidParamSchema` in `packages/shared/schemas/` (e.g., `z.string().uuid()`)
- Validate `c.req.param('id')` against this schema in each handler (or create a small helper/middleware)
- Return `{ error: { code: 'BAD_REQUEST', message: 'Invalid account ID format' } }` with 400 on failure

**Verify:**
- `bun run lint`
- `bun run test`
- Manual test: `GET /api/v1/accounts/not-a-uuid` → 400 (not a Postgres error)

---

### Task 10: Missing tests for accounts route
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md TDD workflow requires route tests. `routes/__tests__/accounts.test.ts` does not exist. The accounts domain has meaningful CRUD + permission logic with zero test coverage.

**Files:**
- `apps/api/src/routes/__tests__/accounts.test.ts` (create)

**Fix:**
- Create `accounts.test.ts` following the pattern in `users.test.ts`
- Cover: happy path CRUD, 401 unauthenticated, 403 forbidden (wrong role), 400 validation errors, 404 not found
- Use `createAuthenticatedUser` and `bearerHeader` helpers
- Test permission boundaries: owner vs editor vs viewer vs no-access

**Verify:**
- `bun run test` — all new tests pass

---

### Task 11: `as Session['user']` type assertions bypass narrowing
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md says *"No `any` types — use `unknown` and narrow"*. Routes use `as Session['user']` casts instead of proper null checks.

**Files:**
- `apps/api/src/routes/accounts.ts:27, 116, 138, 204`

**Fix:**
- Replace `c.get('user') as Session['user']` with a proper null check:
  ```ts
  const user = c.get('user');
  if (!user) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  ```
- Or define a narrowed context type for post-`requireAuth` handlers
- Apply consistently across all route files

**Verify:**
- `bun run lint`
- `bun run build` (no TS errors)
- `bun run test`

---

### Task 12: `Record<string, unknown>` bypasses Drizzle type safety in `updateAccount`
- [ ] Fixed
- [ ] Verified

**Problem:** The update object is typed as `Record<string, unknown>`, bypassing Drizzle's column-level type checking. A column rename in the schema won't produce a compile-time error.

**Files:**
- `apps/api/src/services/accounts.service.ts:85-97`

**Fix:**
- Change to `Partial<typeof financialAccount.$inferInsert>`:
  ```ts
  const updates: Partial<typeof financialAccount.$inferInsert> = {};
  ```

**Verify:**
- `bun run lint`
- `bun run build` (TypeScript catches any mismatches)
- `bun run test`

---

### Task 13: Raw `Date` used instead of `date-fns` via centralized helper
- [ ] Fixed
- [ ] Verified

**Problem:** CLAUDE.md says *"Use `date-fns` via a centralized date helper. Never use raw `Date` for formatting."* `date-fns` is installed but never used.

**Files:**
- `apps/api/src/services/users.service.ts:44-45`
- `apps/api/src/routes/health.ts:6`
- `apps/api/src/middleware/logger.ts:41`

**Fix:**
- Create `apps/api/src/utils/date.ts` with helpers using `date-fns` (e.g., `toISOString`, `formatTimestamp`)
- Replace all `new Date().toISOString()` and `.toISOString()` calls with the helper
- Import from `@/utils/date` in all files

**Verify:**
- `bun run lint`
- `bun run test`

---

### Task 14: `listAccountsByOrg` has weakly typed `status` parameter
- [ ] Fixed
- [ ] Verified

**Problem:** The service accepts `status` as `string` instead of `AccountStatus`. If called from outside the route layer, any string is silently accepted.

**Files:**
- `apps/api/src/services/accounts.service.ts:60`

**Fix:**
- Import `AccountStatus` from `@moneylens/shared/types` (or the constants package)
- Change signature to `status?: AccountStatus`

**Verify:**
- `bun run lint`
- `bun run build`

---

### Task 15: `getUserProfile` throws plain `Error`, returns 500 instead of 404
- [ ] Fixed
- [ ] Verified

**Problem:** `throw new Error('USER_NOT_FOUND')` produces a 500 response. Should be a 404 with the standard error format.

**Files:**
- `apps/api/src/services/users.service.ts:27-29`

**Fix:**
- Use `HTTPException` from `hono/http-exception`:
  ```ts
  throw new HTTPException(404, { message: 'User not found' });
  ```
- Or return `null` and handle the 404 in the route

**Verify:**
- `bun run lint`
- `bun run test`
- Manual test: request a non-existent user → 404 (not 500)

---

### Task 16: `EMAIL_FROM` defaults to Resend's shared testing domain
- [ ] Fixed
- [ ] Verified

**Problem:** `EMAIL_FROM` defaults to `onboarding@resend.dev`. If unset in production, emails come from a domain you don't own.

**Files:**
- `apps/api/src/lib/email/env.ts:5`

**Fix:**
- Remove the `.default(...)` — make it required: `z.string().min(1, 'EMAIL_FROM is required')`
- Add the value to `.env.example`
- Optionally: allow a default only when `NODE_ENV !== 'production'`

**Verify:**
- `bun run lint`
- Start server without `EMAIL_FROM` → should fail at startup

---

### Task 17: `resolveUserAccountRole` doesn't differentiate 404 from 403
- [ ] Fixed
- [ ] Verified

**Problem:** Returns `null` for both "account doesn't exist" and "no access". Non-existent accounts return 403 instead of 404, and the `NOT_FOUND` branch in `DELETE` is unreachable.

**Files:**
- `apps/api/src/services/accounts.service.ts:134-166`
- `apps/api/src/routes/accounts.ts:119-133, 208-216`

**Fix:**
- Return a discriminated result: `{ found: false }` vs `{ found: true, role: string }`
- Routes can then return 404 for not-found and 403 for insufficient permissions
- This also eliminates the second `getAccountById` call (TOCTOU fix)

**Verify:**
- `bun run lint`
- `bun run test`
- Manual test: request a non-existent account → 404; request without access → 403
