# MoneyLens — Build Progress

> Last updated: 2026-03-27 (session 6)

---

## 🏃 Current Sprint

> Two parallel workstreams. Core rule: P1 owns API + shared schemas. P2 owns mobile. Neither touches the other's layer.

### Person 1 — Backend & New Domains
**Owns:** `apps/api/`, `packages/shared/schemas/`, `packages/shared/types/`

#### Recurring Payments (Sprint 1)
- [x] DB schema: `recurring_rule` table (frequency, amount, accountId, categoryId, nextDueDate, isActive)
- [x] `packages/shared/src/schemas/recurring.ts` — create/update/list/response schemas
- [x] `apps/api/src/services/recurring.service.ts` — CRUD + generation logic
- [x] `apps/api/src/services/__tests__/recurring.service.test.ts` — service-level tests for generation (13 tests)
- [x] `apps/api/src/routes/recurring.ts` — full CRUD + pause/resume endpoints
- [x] `apps/api/src/routes/__tests__/recurring.test.ts` — route tests (33 tests)
- [x] `apps/api/src/jobs/generate-recurring.ts` — daily cron: generate due transactions (node-cron, 02:00 UTC)
- [x] `apps/api/src/index.ts` — mount recurring routes + schedule cron

#### Reports API (Sprint 2)
- [ ] `apps/api/src/routes/reports.ts` — income-expenses, spending-by-category, account-summary
- [ ] `packages/shared/src/schemas/report.ts` — response schemas
- [ ] Mount in `apps/api/src/index.ts`

#### Budgets — API only (Sprint 2)
- [ ] DB schema: `budget`, `budget_period` tables
- [ ] `packages/shared/src/schemas/budget.ts`
- [ ] `apps/api/src/services/budget.service.ts` + tests
- [ ] `apps/api/src/routes/budget.ts` + tests

---

### Person 2 — Mobile & Product Polish
**Owns:** `apps/mobile/` — reads (never writes) `packages/shared/`

#### Transaction Polish (Sprint 1)
- [x] `useUpdateTransaction`, `useDeleteTransaction` in `hooks/useTransactions.ts`
- [x] `TransactionItem` tappable → edit/delete bottom sheet
- [ ] `TransactionListScreen` — paginated list with filter bar (account, type, date range)

#### Tags in Transaction Form (Sprint 1)
- [ ] Tag autocomplete chips in transaction form (create-on-type + select existing)
- [ ] Uses existing `GET /api/v1/tags` + `POST /api/v1/tags`

#### Recurring — Mobile (Sprint 2, after P1 ships schemas)
- [ ] `useRecurring` hooks
- [ ] `RecurringScreen` — list rules, create/edit sheet, pause/resume
- [ ] Pending review queue (confirm/adjust auto-generated transactions)

#### Analytics Screen (Sprint 2, after P1 ships reports)
- [ ] Wire up `AnalyticsPlaceholderScreen` using reports API
- [ ] Monthly bar chart (income vs expenses) + spending donut by category

---

### No-conflict ownership
| File / Area | Owner |
|---|---|
| `apps/api/src/index.ts` | P1 only |
| `packages/shared/src/schemas/` | P1 writes → P2 reads |
| `apps/mobile/src/navigation/` | P2 only |
| New DB schema files | P1 only |
| New mobile screens | P2 only |

---

## ✅ Done

### Infrastructure
- [x] Monorepo setup (Turborepo + Bun workspaces)
- [x] Biome linting + formatting
- [x] Lefthook git hooks (lint on pre-commit)
- [x] API test infrastructure (Bun test runner, real PostgreSQL test DB, `truncateAll`, auth helpers)

### API — Authentication
- [x] Better Auth configured (email/password, Google, Apple placeholders)
- [x] `bearer()` plugin enabled for mobile token auth
- [x] `expo()` plugin + `trustedOrigins` configured for React Native (no Origin header)
- [x] `expo-origin: moneylens://` header sent by mobile clients to bypass CSRF
- [x] Personal workspace auto-created on sign-up via direct DB inserts (bypasses BA HTTP layer / CSRF)
- [x] Account creation via direct DB inserts (team + teamMember + financialAccount in one transaction)
- [x] Session middleware fallback: looks up org from member table if `activeOrganizationId` is null
- [x] Session auto-sets `activeOrganizationId` on creation

### API — Users
- [x] `GET /api/v1/users/me` — returns user + profile
- [x] `PATCH /api/v1/users/me` — updates name, avatar, currency, locale
- [x] `user_profile` table with auto-create on first fetch
- [x] Tests: full route coverage

### API — Accounts
- [x] `POST /api/v1/accounts` — creates financial account + BA team
- [x] `GET /api/v1/accounts` — lists by active org, filterable by status
- [x] `GET /api/v1/accounts/:id` — single account with role check
- [x] `PATCH /api/v1/accounts/:id` — update fields, sync BA team name
- [x] `DELETE /api/v1/accounts/:id` — delete account + BA team
- [x] Role-based access (owner/editor/viewer via org or team membership)
- [x] Running balance: `initialBalance + SUM(transactions)` returned on all account responses
- [x] Tests: full route coverage

### Mobile — Auth
- [x] Login + Register screen (mode toggle, confirm password)
- [x] Currency picker on register (USD / BRL chips)
- [x] Device locale auto-detected on register (`expo-localization`) → stored as `locale` in profile
- [x] `expo-secure-store` token persistence
- [x] Zustand auth store (`token`, `user`, `isAuthenticated`)
- [x] Axios API client with Bearer token interceptor + `expo-origin` header
- [x] Auto sign-out on 401
- [x] Auth-conditional navigation (bootstrap from SecureStore)

### Mobile — Profile
- [x] `useUserProfile` hook (TanStack Query)
- [x] ProfileScreen with real API data (avatar, name, email, currency, locale)
- [x] Sign out (calls API + clears store + deletes token)

### Mobile — Accounts
- [x] `useAccounts`, `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount` hooks
- [x] AccountsScreen: list all accounts with running balance display
- [x] Create account bottom sheet (name, type, currency, initial balance, color)
- [x] Currency defaults to user's `defaultCurrency` from profile
- [x] Edit account bottom sheet (pre-filled, save changes)
- [x] Delete account with confirmation alert
- [x] Pull-to-refresh on AccountsScreen
- [x] Accounts tab in bottom navigation (wallet icon)

### API — Categories
- [x] DB schema: `category` table (id, orgId, name, translationKey, icon, color, parentId, sortOrder, isDefault)
- [x] Default categories seeded on workspace creation (12 parents + subcategories)
- [x] All default category icons use Ionicons names (no emojis)
- [x] `GET /api/v1/categories` — list as tree (parents + nested children)
- [x] `POST /api/v1/categories` — create (root or child, max 1 level deep)
- [x] `PATCH /api/v1/categories/:id` — update name, icon, color
- [x] `DELETE /api/v1/categories/:id` — delete (cascades to children)
- [x] Tests: full route coverage (21 tests)
- [x] i18n: `translationKey` for defaults + `CATEGORY_TRANSLATIONS` map in shared package

### Mobile — Categories
- [x] `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` hooks
- [x] CategoriesScreen: tree list (expandable parents → children)
- [x] Create category / subcategory bottom sheet (name, icon, color)
- [x] Edit category / subcategory bottom sheet (pre-filled, delete with confirmation)
- [x] Pull-to-refresh on CategoriesScreen
- [x] Categories tab in bottom navigation (pricetag icon)

### API — Tags
- [x] DB schema: `tag` table (id, orgId, name unique per org)
- [x] `GET /api/v1/tags` — list tags for org
- [x] `POST /api/v1/tags` — create tag (409 on duplicate)
- [x] `DELETE /api/v1/tags/:id` — delete tag
- [x] Tests: full route coverage

### API — Transactions
- [x] DB schema: `transaction` table (id, orgId, accountId→team.id, categoryId nullable, type, signed amount in cents, date YYYY-MM-DD, payee, notes, transferId nullable)
- [x] DB schema: `transaction_tag` join table
- [x] `POST /api/v1/transactions` — create (income, expense, transfer linked pair)
- [x] `GET /api/v1/transactions` — list with cursor pagination + filters (accountId, categoryId, type, dateFrom, dateTo)
- [x] `GET /api/v1/transactions/:id` — single transaction with tags
- [x] `PATCH /api/v1/transactions/:id` — update fields + replace tags
- [x] `DELETE /api/v1/transactions/:id` — delete (cascades both sides of a transfer)
- [x] Transfer handling: linked pair sharing `transferId`, signed amounts (outflow negative, inflow positive)
- [x] Tags: associated on create/update, returned in response
- [x] Tests: full route coverage (35 tests)

### AI lib
- [x] OpenRouter client (`lib/ai/client.ts`) — OpenAI SDK pointing at OpenRouter, model-agnostic
- [x] `lib/ai/env.ts` — `OPENROUTER_API_KEY`, `AI_MODEL`, `AI_VISION_MODEL`, `AI_PDF_CONFIDENCE_THRESHOLD`
- [x] `lib/ai/ocr/pdf.ts` — unpdf text extraction → cheap model confidence scoring → vision fallback if below threshold
- [x] `lib/ai/ocr/image.ts` — vision model for images (base64)
- [x] `lib/ai/ocr/index.ts` — routes by MIME type (PDF vs image)
- [x] `lib/ai/parse.ts` — cheap model parses extracted text → `ParsedTransactionItem[]` with per-item confidence + sourceConfidence

### API — Receipts (CAB-14)
- [x] MinIO via Docker for local S3-compatible storage
- [x] `lib/s3/` — `getPresignedUploadUrl`, `getObject` (AWS SDK, `forcePathStyle` for MinIO)
- [x] `POST /api/v1/receipts/upload-url` — returns pre-signed URL + key
- [x] `POST /api/v1/receipts/extract` — downloads from S3, runs OCR, parses, returns `ParsedTransactionItem[]`
- [x] Tests: 5 route tests (mocked S3 + AI)

### Mobile — Receipt Scanning (CAB-15)
- [x] ScanScreen: camera capture + gallery picker + flash toggle + processing overlay
- [x] ReceiptReviewScreen: pre-filled editable form, low-confidence warning, saves as transaction
- [x] `useGetUploadUrl`, `useExtractReceipt` hooks
- [x] `s3Upload.ts` — direct PUT upload to pre-signed URL
- [x] Scan tab in bottom navigation

### API — Bank Statement Import (CAB-16)
- [x] `POST /api/v1/statements/upload-url` — generates `statements/{uuid}.pdf` pre-signed key
- [x] `POST /api/v1/statements/import` — OCR → parse → match against existing transactions
- [x] Matching: Jaccard word-token similarity (0.6 threshold) + ±3 day date tolerance
- [x] Tests: 12 unit tests for `matchTransactions` + 6 route tests

---

### Mobile — Transactions (HomeScreen)
- [x] `useTransactions`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` hooks
- [x] HomeScreen with real data (accounts, transactions, total balance)
- [x] Pull-to-refresh on HomeScreen (accounts + transactions + profile in parallel)
- [x] Empty state for transactions (icon + message)
- [x] Transaction form bottom sheet (type toggle, amount, account picker, category picker, date, payee, notes)
- [x] Category picker: parent chips (horizontal scroll) → subcategory chips expand below on tap
- [x] Transfer form: From/To account pickers (mutually exclusive)
- [x] Guard: alert if no accounts exist when opening transaction form
- [x] `TransactionItem` component: Ionicons type icon, signed amount, formatted date, tappable
- [x] Edit transaction bottom sheet (pre-filled amount, category, date, payee, notes; type badge non-editable)
- [x] Delete transaction with confirmation alert (cascades both sides of a transfer)

---

## 🔲 Backlog

> Items in the current sprint are tracked above. Everything below is ordered by priority.

### Phase 2 — Core Financial Engine

#### Transactions (Mobile) — polish `[P2]`
- [ ] `TransactionListScreen` — paginated list, filterable by account/category/type/date
- [ ] Edit / delete transaction (tap → detail/edit sheet)

#### Tags (Mobile) `[P2]`
- [ ] Tag autocomplete chips in transaction form (create-on-type + select existing)

### Phase 3 — Smart Data Entry

#### Recurring Payments `[P1 API · P2 Mobile]`
- [x] DB schema: `recurring_rule` table `[P1]`
- [x] `POST/GET/PATCH/DELETE /api/v1/recurring` + pause/resume `[P1]`
- [x] Scheduled job: daily generation of due transactions `[P1]`
- [x] Tests: service-level generation logic `[P1]`
- [ ] Mobile: `RecurringScreen` (list + create/edit sheet + pause/resume) `[P2]`
- [ ] Mobile: Pending review queue `[P2]`

#### Receipt Scanning `[P1 API · P2 Mobile]`
- [x] MinIO added to docker-compose (dev S3, port 9000 / console 9001)
- [x] `apps/api/src/lib/s3/` — `getPresignedUploadUrl`, `getObject` (AWS SDK + MinIO compatible)
- [x] `POST /api/v1/receipts/upload-url` — S3 pre-signed URL `[P1]`
- [x] `POST /api/v1/receipts/extract` — AI OCR pipeline `[P1]`
- [x] Route tests (5 tests, mocked S3 + AI) `[P1]`
- [x] `packages/shared/src/schemas/receipt.ts` — `uploadUrlResponseSchema`, `extractReceiptSchema`
- [x] Mobile: `expo-camera` installed; `ScanScreen` — camera + gallery + flash + processing overlay `[P2]`
- [x] Mobile: `ReceiptReviewScreen` — pre-filled editable form, confidence warning, save as transaction `[P2]`
- [x] Mobile: `Scan` tab wired up in `MainTabNavigator` (camera icon) `[P2]`
- [x] Mobile: `useGetUploadUrl`, `useExtractReceipt` hooks; `s3Upload` service `[P2]`

### Phase 4 — Import & Sharing

#### Bank Statement Import `[P1 API · P2 Mobile]`
- [x] PDF upload + parsing endpoint (`POST /api/v1/statements/upload-url`) `[P1]`
- [x] Transaction matching logic (Jaccard similarity + ±3 day date tolerance) `[P1]`
- [x] `POST /api/v1/statements/import` — returns matched/missing/extra `[P1]`
- [ ] Mobile: Import review UI (matched / missing / extra) `[P2]`
- [ ] Mobile: Bulk-add missing transactions `[P2]`

#### Account Sharing `[P1 API · P2 Mobile]`
- [ ] Invite link generation + validation `[P1]`
- [ ] Permission levels: read-only / read-write `[P1]`
- [ ] Revoke access `[P1]`
- [ ] Mobile: Shared accounts section `[P2]`

### Phase 5 — Insights & Engagement

#### Reports `[P1 API · P2 Mobile]`
- [ ] `GET /api/v1/reports/income-expenses` `[P1]`
- [ ] `GET /api/v1/reports/spending-by-category` `[P1]`
- [ ] `GET /api/v1/reports/account-summary` `[P1]`
- [ ] Mobile: AnalyticsScreen with charts `[P2]`

#### Budgets `[P1 API · P2 Mobile]`
- [ ] DB schema: `budget`, `budget_period` tables `[P1]`
- [ ] `POST/GET/PATCH/DELETE /api/v1/budgets` + rollover logic `[P1]`
- [ ] Tests: service-level rollover tests `[P1]`
- [ ] Mobile: BudgetScreen (overview + create/edit) `[P2]`

#### Dashboard enhancements `[P2]`
- [ ] Net worth calculation display
- [ ] Monthly income vs. expenses summary card
- [ ] Upcoming recurring payments (next 7 days)
- [ ] Pending review count badge

#### Push Notifications `[P1 API · P2 Mobile]`
- [ ] DB schema: `device_token` table `[P1]`
- [ ] `POST /api/v1/notifications/register` `[P1]`
- [ ] Notification dispatch (recurring due, budget 80%/100%, receipt processed) `[P1]`
- [ ] Mobile: expo-notifications setup + permission request `[P2]`
- [ ] Mobile: Notification settings screen `[P2]`

### Phase 6 — Monetization `[P1 API · P2 Mobile]`

- [ ] Stripe integration (subscription management) `[P1]`
- [ ] Tier middleware (`free` / `premium` checks) `[P1]`
- [ ] Free tier limits (2 accounts, 100 tx/month, 5 receipt scans) `[P1]`
- [ ] Mobile: In-app purchase flow (iOS + Android) `[P2]`
- [ ] Mobile: Upgrade prompt UI for locked features `[P2]`
- [ ] Mobile: Settings screen — manage subscription `[P2]`

---

## 🔧 Tech Debt / Polish

- [ ] Replace `AnalyticsPlaceholderScreen` with real analytics once reports are built
- [ ] Settings screen (theme toggle, notification preferences, subscription)
- [ ] Light theme support (currently dark-only)
- [ ] Error boundaries in mobile app
- [ ] App icon + splash screen
- [ ] iOS / Android production build pipeline (EAS Build)
- [ ] CI/CD: GitHub Actions (lint → test → build)
- [ ] Sentry error monitoring
