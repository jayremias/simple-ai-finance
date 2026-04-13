# API Routes Documentation & Architecture Audit

Comprehensive audit of all `apps/api` routes — documenting every endpoint (method, path, payload, response) and verifying that routes properly delegate to the service layer and use Better Auth correctly (no direct DB access in routes).

---

## Route Inventory

### 1. Health — `apps/api/src/routes/health.ts`

| Method | Path             | Auth | Request | Response                | Status |
| ------ | ---------------- | ---- | ------- | ----------------------- | ------ |
| GET    | `/api/v1/health` | None | —       | `{ status, timestamp }` | 200    |

---

### 2. Auth — `apps/api/src/routes/auth.ts`

Delegates entirely to Better Auth handler. Plugins enabled: `expo()`, `bearer()`, `admin()`, `organization()`.

Rate limiting: `authLimiter` (10 req/15min) on all, `sensitiveAuthLimiter` (5 req/15min) on forget-password, reset-password, delete-user.

#### Core Authentication

| Method | Path                        | Auth          | Request                                                 | Response                         |
| ------ | --------------------------- | ------------- | ------------------------------------------------------- | -------------------------------- |
| POST   | `/api/auth/sign-up/email`   | None          | Body: `{ name, email, password, image?, callbackURL? }` | `{ user, session, token }`       |
| POST   | `/api/auth/sign-in/email`   | None          | Body: `{ email, password }`                             | `{ user, session, token }`       |
| POST   | `/api/auth/sign-out`        | Bearer/Cookie | —                                                       | `{}`                             |
| GET    | `/api/auth/session`         | Bearer/Cookie | —                                                       | `{ user, session }` or `null`    |
| POST   | `/api/auth/revoke-sessions` | Bearer/Cookie | —                                                       | `{}` (revokes all user sessions) |

#### Password Reset

| Method | Path                               | Auth | Request                        | Response                     |
| ------ | ---------------------------------- | ---- | ------------------------------ | ---------------------------- |
| POST   | `/api/auth/request-password-reset` | None | Body: `{ email, redirectTo? }` | `{ data: {} }` (sends email) |
| POST   | `/api/auth/reset-password`         | None | Body: `{ password, token }`    | `{ user, session }`          |

#### Email Verification

| Method | Path                                    | Auth | Request           | Response                 |
| ------ | --------------------------------------- | ---- | ----------------- | ------------------------ |
| POST   | `/api/auth/verify-email`                | None | Body: `{ token }` | `{ user, session }`      |
| GET    | `/api/auth/callback/email-verification` | None | Query: `token`    | Redirect to callback URL |

#### Account Deletion

| Method | Path                                | Auth          | Request               | Response                        |
| ------ | ----------------------------------- | ------------- | --------------------- | ------------------------------- |
| POST   | `/api/auth/delete-user`             | Bearer/Cookie | Body: `{ password? }` | `{}` (sends verification email) |
| GET    | `/api/auth/callback/delete-account` | Bearer/Cookie | Query: `token`        | Permanently deletes user        |

#### OAuth / Social Sign-In

| Method | Path                           | Auth | Request                                                                          | Response                |
| ------ | ------------------------------ | ---- | -------------------------------------------------------------------------------- | ----------------------- |
| POST   | `/api/auth/sign-in/social`     | None | Body: `{ provider, callbackURL?, errorCallbackURL?, scopes?, disableRedirect? }` | Redirect to provider    |
| GET    | `/api/auth/callback/:provider` | None | Query: `code, state`                                                             | Redirect to callbackURL |

Providers: `google`, `apple` (conditional on env vars).

#### Organization (Workspace)

| Method | Path                                        | Auth          | Request                                                    | Response                     |
| ------ | ------------------------------------------- | ------------- | ---------------------------------------------------------- | ---------------------------- |
| POST   | `/api/auth/organization/create`             | Bearer/Cookie | Body: `{ name, slug, logo?, metadata? }`                   | `{ data: { organization } }` |
| GET    | `/api/auth/organization/list-organizations` | Bearer/Cookie | —                                                          | `{ organizations: [] }`      |
| GET    | `/api/auth/organization/get-organization`   | Bearer/Cookie | Query: `organizationId?`                                   | `{ organization }`           |
| POST   | `/api/auth/organization/update`             | Bearer/Cookie | Body: `{ organizationId, name?, slug?, logo?, metadata? }` | `{ organization }`           |
| POST   | `/api/auth/organization/delete`             | Bearer/Cookie | Body: `{ organizationId }`                                 | `{}` (owner only)            |
| POST   | `/api/auth/organization/set-active`         | Bearer/Cookie | Body: `{ organizationId }`                                 | `{ session }`                |

#### Members & Invitations

| Method | Path                                        | Auth          | Request                                                    | Response                   |
| ------ | ------------------------------------------- | ------------- | ---------------------------------------------------------- | -------------------------- |
| GET    | `/api/auth/organization/list-members`       | Bearer/Cookie | Query: `organizationId?`                                   | `{ members: [] }`          |
| POST   | `/api/auth/organization/invite-member`      | Bearer/Cookie | Body: `{ email, role, organizationId?, teamId?, resend? }` | `{ invitation }`           |
| POST   | `/api/auth/organization/accept-invitation`  | Bearer/Cookie | Body: `{ invitationId }`                                   | `{}`                       |
| GET    | `/api/auth/callback/invite-member`          | Bearer/Cookie | Query: `invitationId`                                      | Adds user to org/team      |
| POST   | `/api/auth/organization/add-member`         | Bearer/Cookie | Body: `{ userId?, role, organizationId?, teamId? }`        | `{ member }` (server-only) |
| POST   | `/api/auth/organization/remove-member`      | Bearer/Cookie | Body: `{ memberIdOrEmail, organizationId? }`               | `{}`                       |
| POST   | `/api/auth/organization/update-member-role` | Bearer/Cookie | Body: `{ memberIdOrEmail, role, organizationId? }`         | `{ member }`               |
| GET    | `/api/auth/organization/list-roles`         | Bearer/Cookie | Query: `organizationId?`                                   | `{ roles: [] }`            |

#### Teams (Financial Account Access)

| Method | Path                                        | Auth          | Request                             | Response          |
| ------ | ------------------------------------------- | ------------- | ----------------------------------- | ----------------- |
| POST   | `/api/auth/organization/create-team`        | Bearer/Cookie | Body: `{ name, organizationId? }`   | `{ team }`        |
| POST   | `/api/auth/organization/update-team`        | Bearer/Cookie | Body: `{ teamId, data: { name? } }` | `{ team }`        |
| POST   | `/api/auth/organization/remove-team`        | Bearer/Cookie | Body: `{ teamId, organizationId? }` | `{}`              |
| GET    | `/api/auth/organization/list-team-members`  | Bearer/Cookie | Query: `teamId`                     | `{ members: [] }` |
| POST   | `/api/auth/organization/add-team-member`    | Bearer/Cookie | Body: `{ teamId, userId, role }`    | `{ member }`      |
| POST   | `/api/auth/organization/remove-team-member` | Bearer/Cookie | Body: `{ teamId, userId }`          | `{}`              |

#### Admin (requires `admin` role)

| Method | Path                                 | Auth  | Request                                                                                                   | Response                              |
| ------ | ------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| GET    | `/api/auth/admin/list-users`         | Admin | Query: `searchValue?, searchField?, limit?, offset?, sortBy?, sortDirection?, filterField?, filterValue?` | `{ users: [], total, limit, offset }` |
| POST   | `/api/auth/admin/ban-user`           | Admin | Body: `{ userId, banReason?, banExpiresIn? }`                                                             | `{}`                                  |
| POST   | `/api/auth/admin/unban-user`         | Admin | Body: `{ userId }`                                                                                        | `{}`                                  |
| POST   | `/api/auth/admin/list-user-sessions` | Admin | Body: `{ userId }`                                                                                        | `{ sessions: [] }`                    |

---

### 3. Users — `apps/api/src/routes/users.ts`

| Method | Path               | Auth          | Request                                                                | Response            | Status |
| ------ | ------------------ | ------------- | ---------------------------------------------------------------------- | ------------------- | ------ |
| GET    | `/api/v1/users/me` | `requireAuth` | —                                                                      | User profile object | 200    |
| PATCH  | `/api/v1/users/me` | `requireAuth` | Body: `updateUserProfileSchema` (name, image, defaultCurrency, locale) | Updated profile     | 200    |

Service: `getUserProfile()`, `updateUserProfile()` — no direct DB access.

---

### 4. Accounts — `apps/api/src/routes/accounts.ts`

| Method | Path                   | Auth          | Request                                                                                      | Response            | Status |
| ------ | ---------------------- | ------------- | -------------------------------------------------------------------------------------------- | ------------------- | ------ |
| POST   | `/api/v1/accounts`     | `requireAuth` | Body: `createAccountSchema` (name, type, currency, initialBalance, color?, icon?, openedAt?) | Account object      | 201    |
| GET    | `/api/v1/accounts`     | `requireAuth` | Query: `listAccountsQuerySchema` (status?)                                                   | Account array       | 200    |
| GET    | `/api/v1/accounts/:id` | `requireAuth` | Param: id                                                                                    | Account object      | 200    |
| PATCH  | `/api/v1/accounts/:id` | `requireAuth` | Body: `updateAccountSchema` (partial fields + status?)                                       | Updated account     | 200    |
| DELETE | `/api/v1/accounts/:id` | `requireAuth` | Param: id                                                                                    | `{ success: true }` | 200    |

**Authorization logic:**

- POST: Requires org membership with role `owner` or `editor`
- GET /:id, PATCH, DELETE: Uses `resolveUserAccountRole()` service
- PATCH: Viewers blocked; only owners can archive
- DELETE: Only owners

Service: `createAccount()`, `listAccountsByOrg()`, `getAccountById()`, `updateAccount()`, `deleteAccount()`, `resolveUserAccountRole()`

---

### 5. Categories — `apps/api/src/routes/categories.ts`

| Method | Path                     | Auth          | Request                                                                 | Response                           | Status |
| ------ | ------------------------ | ------------- | ----------------------------------------------------------------------- | ---------------------------------- | ------ |
| GET    | `/api/v1/categories`     | `requireAuth` | —                                                                       | Category tree (parents + children) | 200    |
| POST   | `/api/v1/categories`     | `requireAuth` | Body: `createCategorySchema` (name, icon, color, parentId?, sortOrder?) | Category (ISO dates)               | 201    |
| PATCH  | `/api/v1/categories/:id` | `requireAuth` | Body: `updateCategorySchema` (name?, icon?, color?, sortOrder?)         | Category (ISO dates)               | 200    |
| DELETE | `/api/v1/categories/:id` | `requireAuth` | Param: id                                                               | `{ success: true }`                | 200    |

Service: `listCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()` — no direct DB access.

---

### 6. Tags — `apps/api/src/routes/tags.ts`

| Method | Path               | Auth          | Request                                    | Response              | Status |
| ------ | ------------------ | ------------- | ------------------------------------------ | --------------------- | ------ |
| GET    | `/api/v1/tags`     | `requireAuth` | —                                          | Tag array (ISO dates) | 200    |
| POST   | `/api/v1/tags`     | `requireAuth` | Body: `createTagSchema` (name: 1-50 chars) | Tag (ISO dates)       | 201    |
| DELETE | `/api/v1/tags/:id` | `requireAuth` | Param: id                                  | `{ success: true }`   | 200    |

Service: `listTags()`, `createTag()` (throws `DUPLICATE_TAG` -> 409), `deleteTag()` — no direct DB access.

---

### 7. Transactions — `apps/api/src/routes/transactions.ts`

| Method | Path                          | Auth          | Request                                                                                                              | Response                         | Status |
| ------ | ----------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| GET    | `/api/v1/transactions`        | `requireAuth` | Query: `listTransactionsSchema` (accountId?, categoryId?, type?, dateFrom?, dateTo?, search?, cursor?, limit: 1-100) | Paginated list with `nextCursor` | 200    |
| GET    | `/api/v1/transactions/payees` | `requireAuth` | Query: `q` (1-200 chars, optional)                                                                                   | `{ data: [...] }`                | 200    |
| GET    | `/api/v1/transactions/:id`    | `requireAuth` | Param: id                                                                                                            | Transaction with tags            | 200    |
| POST   | `/api/v1/transactions`        | `requireAuth` | Body: `createTransactionSchema` (accountId, categoryId?, type, amount, date, payee?, notes?, tagIds?, toAccountId?)  | Transaction                      | 201    |
| PATCH  | `/api/v1/transactions/:id`    | `requireAuth` | Body: `updateTransactionSchema` (partial, excludes accountId/type)                                                   | Updated transaction              | 200    |
| DELETE | `/api/v1/transactions/:id`    | `requireAuth` | Param: id                                                                                                            | `{ success: true }`              | 200    |

Service: `listTransactions()`, `listPayees()`, `getTransactionById()`, `createTransaction()`, `updateTransaction()`, `deleteTransaction()` — no direct DB access.

---

### 8. Recurring Rules — `apps/api/src/routes/recurring.ts`

| Method | Path                           | Auth          | Request                                                                                                                                 | Response            | Status |
| ------ | ------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| POST   | `/api/v1/recurring`            | `requireAuth` | Body: `createRecurringRuleSchema` (accountId, categoryId?, name, type, amount, frequency, startDate, endDate?, payee?, notes?, tagIds?) | Rule object         | 201    |
| GET    | `/api/v1/recurring`            | `requireAuth` | Query: `listRecurringRulesSchema` (accountId?, isActive?, cursor?, limit?)                                                              | Rule array          | 200    |
| GET    | `/api/v1/recurring/:id`        | `requireAuth` | Param: id                                                                                                                               | Rule object         | 200    |
| PATCH  | `/api/v1/recurring/:id`        | `requireAuth` | Body: `updateRecurringRuleSchema` (partial with nullish)                                                                                | Updated rule        | 200    |
| DELETE | `/api/v1/recurring/:id`        | `requireAuth` | Param: id                                                                                                                               | `{ success: true }` | 200    |
| POST   | `/api/v1/recurring/:id/pause`  | `requireAuth` | Param: id                                                                                                                               | Paused rule         | 200    |
| POST   | `/api/v1/recurring/:id/resume` | `requireAuth` | Param: id                                                                                                                               | Resumed rule        | 200    |

Service: `createRecurringRule()`, `listRecurringRules()`, `getRecurringRuleById()`, `updateRecurringRule()`, `deleteRecurringRule()`, `pauseRecurringRule()`, `resumeRecurringRule()` — no direct DB access.

---

### 9. Receipts — `apps/api/src/routes/receipts.ts`

| Method | Path                          | Auth          | Request                                        | Response                 | Status |
| ------ | ----------------------------- | ------------- | ---------------------------------------------- | ------------------------ | ------ |
| POST   | `/api/v1/receipts/upload-url` | `requireAuth` | —                                              | S3 pre-signed URL object | 201    |
| POST   | `/api/v1/receipts/extract`    | `requireAuth` | Body: `extractReceiptSchema` (key, accountId?) | Extracted receipt data   | 200    |

Service: `createUploadUrl()`, `extractFromKey()` (throws `UNSUPPORTED_FILE_TYPE` -> 400) — no direct DB access.

---

### 10. Statements — `apps/api/src/routes/statements.ts`

| Method | Path                            | Auth          | Request                                        | Response                                       | Status |
| ------ | ------------------------------- | ------------- | ---------------------------------------------- | ---------------------------------------------- | ------ |
| POST   | `/api/v1/statements/upload-url` | `requireAuth` | —                                              | S3 pre-signed URL object                       | 201    |
| POST   | `/api/v1/statements/import`     | `requireAuth` | Body: `importStatementSchema` (key, accountId) | Import result (matched, missing, extra arrays) | 200    |

Service: `getStatementUploadUrl()`, `importStatement()` — no direct DB access.
