# MoneyLens

Mobile-first personal finance app for tracking accounts, expenses, income, and subscriptions across multiple financial accounts. Combines manual entry with AI-powered receipt scanning and bank statement import.

## Tech Stack

### Mobile Client

- **Runtime/Package Manager**: Bun
- **Framework**: React Native (cross-platform iOS + Android)
- **UI Library**: Tamagui (theming, responsive styles, native feel)
- **Navigation**: React Navigation (deep linking from push notifications)
- **State Management**: TanStack Query (server state) + Zustand (local UI state)
- **Forms**: React Hook Form + Zod (validation shared with backend schemas)
- **HTTP Client**: Axios or ky (interceptors for auth token injection and refresh)
- **Secure Storage**: expo-secure-store (iOS Keychain / Android Keystore)
- **Camera**: expo-camera or react-native-vision-camera (receipt capture)
- **Push Notifications**: expo-notifications + FCM/APNs
- **Charts**: Victory Native or react-native-chart-kit

### Backend (API)

- **Runtime**: Bun
- **Framework**: Hono (lightweight, fast routing, middleware-friendly, native Bun support)
- **ORM**: Drizzle ORM (type-safe, SQL-like syntax, great migration tooling)
- **Validation**: Zod (schemas shared between client and server via shared package)
- **Auth**: Better Auth (session-based auth, social sign-in, email verification)
- **Email**: Resend or AWS SES (transactional emails)
- **Scheduler**: Bun cron or node-cron (daily recurring payment generation)
- **File Upload**: Pre-signed S3 URLs (client uploads directly to S3)

### Infrastructure

- **Database**: PostgreSQL 16+ (hosted: AWS RDS, Supabase, or Neon)
- **Object Storage**: AWS S3 (temporary receipt images with 24h lifecycle policy)
- **Queue**: AWS SQS (deferred — only when async processing is needed)
- **Cache**: Redis / Upstash (deferred — only if session/rate-limit performance requires it)
- **Hosting**: AWS (ECS/Fargate), Railway, or Fly.io (containerized Hono server)
- **Monorepo**: Turborepo (build caching and task orchestration)
- **Linter/Formatter**: Biome (replaces ESLint + Prettier)
- **CI/CD**: GitHub Actions (lint → test → build → deploy)
- **Monitoring**: Sentry (errors) + CloudWatch (infra)

## Commands

```bash
bun dev              # Start dev servers (via Turborepo)
bun run build        # Production build
bun run lint         # Biome check
bun run format       # Biome format --write
bun run db:push      # Push schema to DB (local dev — no migration files)
bun run db:generate  # Generate Drizzle migrations (end of feature, when asked)
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
bun run test         # Run tests (Bun test runner for API, Jest for mobile)
```

## Project Structure

```
moneylens/
├── apps/
│   ├── mobile/              # React Native app
│   │   ├── src/
│   │   │   ├── screens/     # Screen components
│   │   │   ├── components/  # Shared UI components
│   │   │   ├── navigation/  # React Navigation setup
│   │   │   ├── hooks/       # Custom hooks (queries, mutations)
│   │   │   ├── stores/      # Zustand stores (local state)
│   │   │   ├── services/    # API client, auth, storage
│   │   │   ├── theme/       # Tamagui theme config
│   │   │   └── utils/       # Helpers, formatters, constants
│   │   └── app.json
│   │
│   └── api/                 # Hono backend
│       ├── src/
│       │   ├── routes/      # Route handlers grouped by domain
│       │   ├── middleware/   # Auth, validation, rate limiting, tier check
│       │   ├── services/    # Business logic layer
│       │   ├── lib/         # Integration abstractions (S3, AI, email, push)
│       │   │   └── db/      # Drizzle schema, migrations, queries
│       │   ├── jobs/        # Scheduled tasks (recurring payments)
│       │   └── utils/       # Helpers, constants
│       └── drizzle.config.ts
│
├── packages/
│   └── shared/              # Shared between mobile and API
│       ├── schemas/         # Zod validation schemas
│       ├── types/           # TypeScript types/interfaces
│       └── constants/       # Enums, currency codes, category defaults
│
├── package.json             # Workspace root
└── turbo.json               # Turborepo config
```

### Why Monorepo?

- **Shared Zod schemas** — defined once in `packages/shared/schemas/`, used by both API (request validation) and mobile (form validation). A change in one place updates both.
- **Shared types** — TypeScript interfaces for API responses keep client and server in sync.
- **Atomic changes** — a feature that touches both API and mobile can be a single PR.
- **Turborepo** — handles build caching and task orchestration across packages.

## Architecture Layers

```
┌─────────────────────────────────┐
│     Mobile Client               │
│   React Native + Tamagui        │
└──────────────┬──────────────────┘
               │ HTTPS (REST)
               ▼
┌─────────────────────────────────┐
│     API Server (Hono on Bun)    │
│  Routes → Services → DB/Lib    │
└──────┬──────┬──────┬──────┬────┘
       │      │      │      │
       ▼      ▼      ▼      ▼
   PostgreSQL Redis  SQS    S3
```

- **`apps/mobile/src/screens/`** — Screen components, no business logic
- **`apps/mobile/src/hooks/`** — TanStack Query hooks for server state
- **`apps/mobile/src/stores/`** — Zustand stores for local UI state
- **`apps/api/src/routes/`** — Route handlers grouped by domain
- **`apps/api/src/services/`** — Business logic layer
- **`apps/api/src/middleware/`** — Auth, validation, rate limiting, tier check
- **`apps/api/src/lib/db/`** — Drizzle schema, migrations, queries
- **`packages/shared/schemas/`** — Zod validation schemas shared between client and server

## Coding Conventions

- **TypeScript**: Strict mode. No `any` types — use `unknown` and narrow.
- **Biome**: All code must pass `biome check`. No ESLint/Prettier — Biome handles both.
- **Validation (Zod)**: Use Zod for **all validation** — form inputs (via React Hook Form resolver), API request/response bodies, environment variables, query params, URL params, and any external data. Schemas live in `packages/shared/schemas/` and are consumed by both mobile and API.
- **Monetary Values**: Always stored as integers in cents. No floating point anywhere. Round only at display time.
- **IDs**: UUIDs for all primary keys (generated server-side).
- **API Convention**: RESTful endpoints, base path `/api/v1/`, JSON request/response bodies.
- **Error Format**: `{ error: { code: string, message: string, details?: object } }`
- **Pagination**: Cursor-based for transaction lists, offset-based for small collections.
- **Imports**: Use `@/` path alias where configured.
- **Date Handling**: Use `date-fns` via a centralized date helper. Never use raw `Date` for formatting.
- **Environment Variables**: Validate with Zod at startup — never read `process.env` directly.
- **No hardcoded secrets in mobile**: API keys, tokens, and secrets must never be hardcoded in mobile source files. Use Expo's `app.config.js` `extra` field + `expo-constants` to inject at build time, and keep keys out of source control.

## Validation (Zod)

Zod is the **single validation library** across the entire stack. All schemas live in `packages/shared/schemas/` unless they are backend-only.

| Use Case               | Location                                  | Example                                              |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Form validation        | `packages/shared/schemas/`                | `createTransactionSchema`, `loginSchema`             |
| API request bodies     | `packages/shared/schemas/`                | Same schemas used in Hono middleware validation      |
| API response types     | `packages/shared/schemas/`                | `transactionResponseSchema`, `accountResponseSchema` |
| Environment variables  | `apps/api/src/lib/*/env.ts`               | `envSchema.parse(process.env)` (one per lib/feature) |
| Query/URL params       | `packages/shared/schemas/` or route-level | `paginationSchema`, `dateRangeSchema`                |
| External API responses | `apps/api/src/lib/`                       | Validate AI provider responses, S3 responses         |

**Key rule**: Never trust external input. Every boundary (user input, API request, external service response, environment) must pass through a Zod schema.

## Database (Drizzle ORM)

- PostgreSQL 16+ with Drizzle ORM
- Schemas defined in `apps/api/src/lib/db/` using `pgTable` (split by domain)
- Config in `apps/api/drizzle.config.ts`
- Migrations via Drizzle Kit (`drizzle-kit generate`, `drizzle-kit migrate`)
- **Local dev**: Use `db:push` (`drizzle-kit push`) to apply schema changes directly — no migration files. Generate migration files only at the end of a feature, when explicitly asked.
- Use Drizzle's query builder — avoid raw SQL

### Schema Conventions

- All monetary values as **integers in cents** — no floating point
- **UUID** primary keys (generated server-side, native Postgres support)
- All tables include `created_at` and `updated_at` timestamps
- No soft deletes — deleted data is removed (with cascading where appropriate)
- Indexes on all foreign keys and commonly filtered columns (date, type, category_id)

### Domain Model — Better Auth primitives map to app concepts

Better Auth's `organization` and `team` primitives are repurposed as first-class domain entities:

| Better Auth primitive | App concept  | Description                                                        |
| --------------------- | ------------ | ------------------------------------------------------------------ |
| `organization`        | **Workspace** | Top-level container. Auto-created as "Personal" on sign-up. Users can be invited to share an entire workspace. |
| `team`                | **Account**  | A financial account (bank account, credit card, investment, etc.) within a workspace. Users can be invited to individual accounts. |

- **Sharing at workspace level** → invite user to `organization` (sees all accounts)
- **Sharing at account level** → invite user to a specific `team` (sees only that account)
- Our `financial_account` table **extends** `team` with finance-specific metadata (type, currency, balance snapshot, color, icon). It is NOT a replacement — every financial account has a corresponding Better Auth team.
- Transactions, budgets, categories, etc. reference `team.id` (= account id), not a standalone FK.

### Core Tables

`user_profile`, `financial_account` (extends BA `team`), `transaction`, `transaction_split`, `category`, `tag`, `transaction_tag`, `recurring_rule`, `budget`, `budget_period`, `exchange_rate`, `device_token`

> Better Auth manages: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `team`, `team_member`

## Authentication

- **Better Auth** — session-based authentication library
- Sessions managed by Better Auth (cookies/bearer tokens, DB-backed)
- Social sign-in: Google + Apple via Better Auth plugins
- Email verification and password reset handled by Better Auth
- Session tokens stored in device secure storage via `expo-secure-store` (not AsyncStorage)
- Better Auth manages its own DB tables (user, session, account, verification, organization, member, invitation, team, team_member)
- **`bearer()` plugin enabled** — mobile clients authenticate via `Authorization: Bearer <token>`

## API Design

### Middleware Stack (order matters)

1. **CORS** — configured for mobile client origins
2. **Rate Limiter** — per-IP and per-user limits (stricter on auth routes)
3. **Auth** — Better Auth session middleware, attach user to context (skip for public routes)
4. **Tier Check** — verify user's subscription tier allows the action
5. **Validation** — Zod schema validation on request body/params
6. **Handler** — route-specific business logic

### Route Domains

| Domain         | Key Endpoints                                                                   |
| -------------- | ------------------------------------------------------------------------------- |
| Auth           | register, login, refresh, social, forgot-password, reset-password, verify-email |
| Users          | GET/PATCH/DELETE `/users/me`                                                    |
| Accounts       | CRUD `/accounts`, `/accounts/:id`                                               |
| Transactions   | CRUD `/transactions`, split, search/filter                                      |
| Categories     | CRUD with parent_id hierarchy                                                   |
| Tags           | CRUD with autocomplete                                                          |
| Recurring      | CRUD, pause/resume                                                              |
| Budgets        | CRUD with monthly tracking                                                      |
| Reports        | income-expenses, spending-by-category, account-summary                          |
| Receipts       | pre-signed upload URL, AI extraction trigger                                    |
| Statements     | PDF upload, poll for results                                                    |
| Sharing        | invite link, permissions, revoke                                                |
| Exchange Rates | manual rate management                                                          |
| Notifications  | device token registration, notification settings                                |

## Claude Code Skills

Available slash commands for development workflow:

| Skill           | Command            | Description                                                                   |
| --------------- | ------------------ | ----------------------------------------------------------------------------- |
| Feature Dev     | `/feature-dev`     | Guided feature development with codebase understanding and architecture focus |
| Code Review     | `/code-review`     | Review a pull request for issues and improvements                             |
| Frontend Design | `/frontend-design` | Create polished, production-grade frontend interfaces                         |

## MCP Servers

Available MCP integrations:

| MCP Server     | Purpose                          | Usage                                                                                                                          |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Context7**   | Up-to-date library documentation | Use `resolve-library-id` then `query-docs` to fetch latest docs for any library (TanStack Query, Drizzle, Hono, Tamagui, etc.) |
| **Playwright** | Browser automation and testing   | Use for E2E testing, screenshots, and browser interactions                                                                     |
| **Slack**      | Team communication               | Send messages, read channels, search conversations                                                                             |
| **Figma**      | Design integration               | Get screenshots, design context, and metadata from Figma files                                                                 |

When implementing features, use **Context7** to look up the latest API patterns for Hono, Drizzle, React Native, Tamagui, and other dependencies before writing code.

## Backend TDD Workflow

All backend features are built in this strict order: **test → service → route**.

### What to test at each level

Choose the test level based on what is actually being validated:

| Feature type | Test level | Rationale |
|---|---|---|
| Simple CRUD (accounts, categories, tags) | Route tests only | Routes are thin — HTTP contract + auth + validation covers everything meaningful |
| Complex business logic (budget rollover, recurring payment generation, balance calculations) | Service tests | Logic should be tested in isolation, not buried inside an HTTP test |
| Pure utilities / calculations | Unit tests | No DB or HTTP needed |

Route tests are integration tests — they exercise the service and DB through the HTTP layer. For simple CRUD, this is sufficient. Only add dedicated service tests when the service contains logic worth testing independently.

### Order of Implementation

1. **Write the test first**
   - Simple CRUD → `apps/api/src/routes/__tests__/<feature>.test.ts` (HTTP-level, uses `app.request()`)
   - Complex logic → `apps/api/src/services/__tests__/<feature>.service.test.ts` (calls service directly)
   - Tests must fail initially (red phase)

2. **Write the service** — `apps/api/src/services/<feature>.service.ts`
   - Pure business logic, zero HTTP concerns
   - Accepts typed inputs, returns typed outputs
   - Throws domain errors (not HTTP errors)

3. **Write the route** — `apps/api/src/routes/<feature>.ts`
   - Thin handler: validate input → call service → serialize response
   - No business logic in routes

4. **Run tests** — All tests must pass (`bun test`) before moving to the next feature

### Route test coverage (when used)

Cover: happy path, 401 unauthenticated, 403 forbidden, 400 validation errors, 404 not found.

### Test Setup

- **Runner**: Bun (`bun test` in `apps/api/`)
- **Database**: Real PostgreSQL test DB — `apps/api/.env.test` loaded automatically when `NODE_ENV=test`
- **Lifecycle**: Tables truncated in `beforeEach` via `truncateAll()` helper
- **HTTP testing**: Hono's `app.request()` — no real server needed
- **Auth**: Test helpers create users + sessions directly in DB (bypass Better Auth for test setup)
- **Helpers**: `apps/api/src/tests/helpers/` — `db.ts` (truncateAll), `auth.ts` (createAuthenticatedUser, bearerHeader)

### File Naming Conventions

```
src/
  routes/
    <feature>.ts                          # Route handler
    __tests__/
      <feature>.test.ts                   # HTTP-level tests (simple CRUD)
  services/
    <feature>.service.ts                  # Business logic
    __tests__/
      <feature>.service.test.ts           # Service-level tests (complex logic only)
```

## Git Conventions

- Branch naming: `feature/`, `fix/`, `chore/` prefixes
- Commit messages: imperative mood, concise (e.g., "add transaction CRUD routes")
- PR into `main` branch, squash merge
- CI: GitHub Actions runs lint → test → build on every PR

## Documentation

- **PRD**: `docs/moneylens-mobile-prd.md` — full product requirements, features, phases, acceptance criteria
- **Tech Overview**: `docs/moneylens-tech-overview.md` — architecture, tech stack details, database schema, processing pipelines, deployment
- **Progress Tracker**: `docs/progress.md` — what is done and what still needs to be built, ordered by priority. **Read this at the start of every session** to understand current state and next steps.

## Guidelines

- Never search or look up for information in `node_modules/` folder — ask or use **Context7**
- Always simple and elegant solutions — DON'T overthink or over-engineer
- No assumptions — ask always
- Always score from 0-10 in how confident you are with the plan. Be realistic. We always can think more and continue planning.
- When planning always give your thoughts about the request. If you see ways to improve, suggest them.
- You can use external packages — they just need to be well maintained and secure
- We can implement in steps. First simple solution to validate the implementation and code. Get feedback. Then improve.
- You can ask for human interaction to solve things. I am a experience 20+ yrs developer.
- Never use workarounds — if something doesn't work, ask for help. We are a team.
- **No emojis in UI** — always use an icon library (the project uses `@expo/vector-icons` / Ionicons). Never use emoji characters as icons or decorative elements in mobile screens.
- **One thing per file** — components, classes, error types, and other named units each live in their own file. Never bundle multiple unrelated exports into a single file.
- **No abbreviated variable names** — always use descriptive names. Never use single-letter or shortened names like `v`, `e`, `t`, `cb`, `fn`, `val`, `obj`, etc. Write `value`, `event`, `transaction`, `callback`, `onPress`, etc.
