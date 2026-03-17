# MoneyLens — Build Progress

> Last updated: 2026-03-17

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
- [x] Personal workspace auto-created on sign-up (org DB hook)
- [x] Session auto-sets `activeOrganizationId` on creation
- [x] Wildcard routing fixed (`*` not `**`)

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
- [x] Tests: full route coverage

### Mobile — Auth
- [x] Login + Register screen (mode toggle, confirm password)
- [x] `expo-secure-store` token persistence
- [x] Zustand auth store (`token`, `user`, `isAuthenticated`)
- [x] Axios API client with Bearer token interceptor
- [x] Auto sign-out on 401
- [x] Auth-conditional navigation (bootstrap from SecureStore)

### Mobile — Profile
- [x] `useUserProfile` hook (TanStack Query)
- [x] ProfileScreen with real API data (avatar, name, email, currency, locale)
- [x] Sign out (calls API + clears store + deletes token)

### Mobile — Accounts
- [x] `useAccounts`, `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount` hooks
- [x] AccountsScreen: list all accounts with balance display
- [x] Create account bottom sheet (name, type, currency, initial balance, color)
- [x] Edit account bottom sheet (pre-filled, save changes)
- [x] Delete account with confirmation alert
- [x] Accounts tab in bottom navigation (wallet icon)

### API — Categories
- [x] DB schema: `category` table (id, orgId, name, translationKey, icon, color, parentId, sortOrder, isDefault)
- [x] Default categories seeded on workspace creation (12 parents + subcategories)
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

---

## 🔲 To Do

> Ordered by priority — core features first.

### Phase 2 — Core Financial Engine

#### Category Picker (Mobile)
- [ ] Mobile: Category picker component (reusable bottom sheet for transaction form)

#### Transactions (Mobile) — depends on API done above
- [ ] Mobile: `useTransactions`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` hooks
- [ ] Mobile: TransactionListScreen (paginated, filterable)
- [ ] Mobile: Transaction form (quick-add FAB + full form)
- [ ] Mobile: HomeScreen with real data (replace mock data)

#### Account Balances (API)
- [ ] Balance calculation: `initialBalance + SUM(transactions)` per account
- [ ] Include current balance in `GET /api/v1/accounts` and `GET /api/v1/accounts/:id` responses

### Phase 3 — Smart Data Entry

#### Recurring Payments
- [ ] DB schema: `recurring_rule` table
- [ ] `POST /api/v1/recurring` — create rule
- [ ] `GET /api/v1/recurring` — list rules
- [ ] `PATCH /api/v1/recurring/:id` — update, pause/resume
- [ ] `DELETE /api/v1/recurring/:id`
- [ ] Scheduled job: daily generation of due transactions (auto-post + pending)
- [ ] Tests: service-level tests for generation logic
- [ ] Mobile: RecurringScreen (list upcoming + manage rules)
- [ ] Mobile: Pending review queue (confirm/adjust pending transactions)

#### Receipt Scanning
- [ ] S3 pre-signed URL endpoint: `POST /api/v1/receipts/upload-url`
- [ ] AI extraction endpoint: `POST /api/v1/receipts/extract`
- [ ] Mobile: Camera capture (expo-camera or react-native-vision-camera)
- [ ] Mobile: Receipt review form (pre-filled, editable before save)
- [ ] Mobile: Scan tab wired up (replaces ScanPlaceholderScreen)

### Phase 4 — Import & Sharing

#### Bank Statement Import (PDF)
- [ ] PDF upload + parsing endpoint
- [ ] Transaction matching logic (amount + date + description similarity)
- [ ] Import review UI (grouped: matched / missing / extra)
- [ ] Bulk-add missing transactions

#### Account Sharing
- [ ] Invite link generation + validation
- [ ] Permission levels: read-only / read-write
- [ ] Revoke access
- [ ] Mobile: Shared accounts section

### Phase 5 — Insights & Engagement

#### Dashboard (real data)
- [ ] Net worth calculation (assets minus liabilities)
- [ ] Monthly income vs. expenses summary
- [ ] Upcoming recurring payments (next 7 days)
- [ ] Pending review count
- [ ] Recent transactions list

#### Reports
- [ ] `GET /api/v1/reports/income-expenses` — monthly income vs. expenses for the year
- [ ] `GET /api/v1/reports/spending-by-category` — totals per category for a period
- [ ] `GET /api/v1/reports/account-summary` — current balance per account
- [ ] Mobile: AnalyticsScreen with charts (replace AnalyticsPlaceholderScreen)

#### Budgets
- [ ] DB schema: `budget`, `budget_period` tables
- [ ] `POST /api/v1/budgets`, `GET`, `PATCH`, `DELETE`
- [ ] Budget period auto-creation and rollover logic
- [ ] Tests: service-level tests for rollover calculations
- [ ] Mobile: BudgetScreen (overview + create/edit budgets)

#### Push Notifications
- [ ] DB schema: `device_token` table
- [ ] `POST /api/v1/notifications/register` — register device token
- [ ] Notification dispatch for: recurring due, budget 80%/100%, receipt/statement processed
- [ ] Mobile: expo-notifications setup + permission request
- [ ] Mobile: Notification settings screen

### Phase 6 — Monetization

- [ ] Stripe integration (subscription management)
- [ ] Tier middleware (`free` / `premium` checks on relevant endpoints)
- [ ] Free tier limits enforcement (2 accounts, 100 tx/month, 5 receipt scans)
- [ ] In-app purchase flow (iOS + Android)
- [ ] Upgrade prompt UI for locked features
- [ ] Settings screen: manage subscription

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
