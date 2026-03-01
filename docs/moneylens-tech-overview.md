# MoneyLens — Technical Architecture Overview

> **Version:** 1.0
> **Last Updated:** February 28, 2026
> **Status:** Draft
> **Companion:** MoneyLens PRD v1.0

---

## 1. System Architecture

MoneyLens follows an **API-first architecture** with a clear separation between the mobile client and backend services. The API is the single source of truth — the mobile app is one consumer, and a future web app will be another.

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile Client                         │
│              React Native + Tamagui (iOS/Android)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (REST)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Server                           │
│                     Hono on Bun runtime                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │   Auth    │  │  CRUD    │  │ Recurring │  │  Upload    │  │
│  │  Routes   │  │  Routes  │  │ Scheduler │  │  Handler   │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
└─────┬──────────────┬──────────────┬──────────────┬──────────┘
      │              │              │              │
      ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ PostgreSQL│  │  Redis   │  │ AWS SQS  │  │    AWS S3    │
│ (primary) │  │ (cache/  │  │ (async   │  │  (temp image │
│           │  │  sessions)│  │  jobs)   │  │   storage)   │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │  AI Provider  │
                        │  (OCR / PDF   │
                        │   parsing)    │
                        └──────────────┘
```

**Key principle:** Start simple. Redis and SQS are shown for completeness but will only be introduced when there's a measurable need. The initial build uses PostgreSQL for everything and processes jobs synchronously or via simple in-process background tasks.

---

## 2. Tech Stack Details

### 2.1 Mobile Client

| Component          | Choice                                    | Notes                                                                       |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------- |
| Framework          | React Native                              | Cross-platform from a single codebase                                       |
| UI Library         | Tamagui                                   | Performant theming, responsive styles, native feel                          |
| Navigation         | React Navigation                          | Standard for RN, supports deep linking from push notifications              |
| State Management   | TanStack Query + Zustand                  | TanStack Query for server state (caching, sync), Zustand for local UI state |
| Forms              | React Hook Form + Zod                     | Validation shared with backend schemas                                      |
| HTTP Client        | Axios or ky                               | Interceptors for auth token injection and refresh                           |
| Secure Storage     | expo-secure-store                         | iOS Keychain / Android Keystore for tokens                                  |
| Camera             | expo-camera or react-native-vision-camera | Receipt capture                                                             |
| Push Notifications | expo-notifications + FCM/APNs             | Cross-platform notification handling                                        |
| Charts             | Victory Native or react-native-chart-kit  | Mobile-optimized chart rendering                                            |

### 2.2 Backend

| Component      | Choice                | Notes                                                                   |
| -------------- | --------------------- | ----------------------------------------------------------------------- |
| Runtime        | Bun                   | Fast startup, native TS, built-in test runner                           |
| Framework      | Hono                  | Lightweight, fast routing, middleware-friendly, works natively on Bun   |
| ORM            | Drizzle ORM           | Type-safe, SQL-like syntax, great migration tooling, low overhead       |
| Validation     | Zod                   | Schema validation shared between client and server via a shared package |
| Auth           | Custom (JWT)          | Access + refresh token pattern; social sign-in via provider SDKs        |
| Email          | Resend or AWS SES     | Transactional emails (verification, password reset)                     |
| Cron/Scheduler | Bun cron or node-cron | Daily recurring payment generation                                      |
| File Upload    | Pre-signed S3 URLs    | Client uploads directly to S3, never through the API server             |

### 2.3 Infrastructure

| Component      | Choice                                | Notes                                                                  |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Database       | PostgreSQL 16+                        | Hosted (AWS RDS, Supabase, or Neon)                                    |
| Object Storage | AWS S3                                | Temporary receipt images with lifecycle policy (auto-delete after 24h) |
| Queue          | AWS SQS                               | Deferred — only added when async processing is needed                  |
| Cache          | Redis (Upstash or AWS ElastiCache)    | Deferred — only if session/rate-limit performance requires it          |
| Hosting        | AWS (ECS/Fargate), Railway, or Fly.io | Containerized Hono server; choice based on cost and simplicity         |
| CI/CD          | GitHub Actions                        | Lint, test, build, deploy pipeline                                     |
| Monitoring     | Sentry (errors) + basic CloudWatch    | Error tracking on both client and server                               |

---

## 3. Project Structure

### 3.1 Monorepo Layout

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
│       │   ├── lib/         # integration abstraction, S3, AI provider, email, push notifications
│       │   │    ├── db/          # Drizzle schema, migrations, queries
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
└── turbo.json               # Turborepo config (or nx.json)
```

### 3.2 Why Monorepo?

- **Shared validation schemas** — Zod schemas defined once, used by both API (request validation) and mobile (form validation). A change in one place updates both.
- **Shared types** — TypeScript interfaces for API responses ensure client and server stay in sync without manual duplication.
- **Atomic changes** — A feature that touches both API and mobile can be a single PR.
- **Tooling** — Turborepo handles build caching and task orchestration across packages.

---

## 4. Authentication Flow

```
┌────────┐                    ┌────────┐                   ┌────────┐
│ Mobile │                    │  API   │                   │Provider│
│ Client │                    │ Server │                   │(Google/│
│        │                    │        │                   │ Apple) │
└───┬────┘                    └───┬────┘                   └───┬────┘
    │                             │                            │
    │  ── Email/Password ──────▶  │                            │
    │                             │ validate + hash            │
    │  ◀── access + refresh ───── │                            │
    │                             │                            │
    │  ── Social Sign-In ──────▶  │                            │
    │                             │ ── verify token ─────────▶ │
    │                             │ ◀── user info ──────────── │
    │  ◀── access + refresh ───── │                            │
    │                             │                            │
    │  ── API request ──────────▶ │                            │
    │     (Authorization: Bearer) │ verify access token        │
    │  ◀── response ───────────── │                            │
    │                             │                            │
    │  ── refresh ──────────────▶ │                            │
    │     (refresh token in body) │ rotate refresh token       │
    │  ◀── new access + refresh ─ │                            │
    │                             │                            │
```

**Token strategy:**

- Access token: JWT, 15-minute expiry, contains user ID and tier
- Refresh token: opaque string stored in DB, 30-day expiry, rotated on every use
- Tokens stored in device secure storage (not AsyncStorage)
- On 401 response, client automatically attempts refresh before failing

---

## 5. API Design

### 5.1 Convention

- RESTful endpoints
- Base path: `/api/v1/`
- JSON request and response bodies
- Consistent error format: `{ error: { code: string, message: string, details?: object } }`
- Pagination: cursor-based for transaction lists, offset-based for small collections
- Versioned from day one (`v1`) to allow non-breaking evolution

### 5.2 Route Overview

| Domain         | Endpoints                                                                                                                                    | Notes                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Auth           | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/social`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` | Public routes (no auth required)         |
| Users          | `GET /users/me`, `PATCH /users/me`, `DELETE /users/me`                                                                                       | Profile management                       |
| Accounts       | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id`                                                                                       | Financial account CRUD                   |
| Transactions   | `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/:id`, `POST /transactions/:id/split`                                               | Includes search/filter via query params  |
| Categories     | `GET/POST /categories`, `PATCH/DELETE /categories/:id`                                                                                       | Hierarchical with parent_id              |
| Tags           | `GET/POST /tags`, `DELETE /tags/:id`                                                                                                         | Flat labels with autocomplete            |
| Recurring      | `GET/POST /recurring`, `GET/PATCH/DELETE /recurring/:id`, `POST /recurring/:id/pause`, `POST /recurring/:id/resume`                          | Rule management                          |
| Budgets        | `GET/POST /budgets`, `GET/PATCH/DELETE /budgets/:id`                                                                                         | Monthly budget tracking                  |
| Reports        | `GET /reports/income-expenses`, `/reports/spending-by-category`, `/reports/account-summary`                                                  | Query params for date range and currency |
| Receipts       | `POST /receipts/upload-url` (get pre-signed S3 URL), `POST /receipts/extract` (trigger AI processing)                                        | Two-step: get URL, then extract          |
| Statements     | `POST /statements/upload`, `GET /statements/:id/results`                                                                                     | Upload PDF, poll for results             |
| Sharing        | `POST /accounts/:id/share`, `DELETE /accounts/:id/share/:shareId`, `GET /shared-accounts`                                                    | Invite link generation and management    |
| Exchange Rates | `GET/POST /exchange-rates`                                                                                                                   | Manual rate management                   |
| Notifications  | `POST /devices/token`, `GET/PATCH /notifications/settings`                                                                                   | Device registration and preferences      |

### 5.3 Middleware Stack

Every request passes through middleware in this order:

1. **CORS** — configured for mobile client origins
2. **Rate limiter** — per-IP and per-user limits (stricter on auth routes)
3. **Auth** — verify JWT, attach user to context (skip for public routes)
4. **Tier check** — verify user's subscription tier allows the requested action
5. **Validation** — Zod schema validation on request body/params
6. **Handler** — route-specific business logic

---

## 6. Database Overview

### 6.1 Principles

- All monetary values stored as **integers in cents** — no floating point
- All primary keys are **UUIDs** (generated server-side)
- All tables include `created_at` and `updated_at` timestamps
- Soft deletes are not used — deleted data is removed (with cascading where appropriate)
- Indexes on all foreign keys and commonly filtered columns (date, type, category_id)

### 6.2 Key Schema Decisions

| Decision                              | Rationale                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Cents for money                       | Avoids floating-point rounding issues across all currencies                   |
| UUID primary keys                     | No sequential ID leaking, safe for public-facing APIs                         |
| Separate `transaction_split` table    | Keeps the transaction table clean; splits are optional and queried separately |
| `account_share` table (not org model) | Simpler than organization-based sharing for direct user-to-user permissions   |
| `budget_period` table                 | Tracks rollover amounts across months without recalculating from full history |
| `device_token` table                  | Supports multiple devices per user for push notifications                     |
| Pre-seeded categories per user        | Each user gets their own copy to customize freely without affecting others    |

### 6.3 Migrations

- Managed by Drizzle Kit (`drizzle-kit generate`, `drizzle-kit migrate`)
- Migration files are committed to the repo
- Applied automatically on server startup in development
- Applied manually or via CI in production

---

## 7. Receipt Processing Pipeline

```
┌────────┐     ┌─────────┐     ┌────────┐     ┌──────────┐     ┌────────┐
│ Camera/ │────▶│ Get S3  │────▶│ Upload │────▶│ Call AI  │────▶│ Return │
│ Gallery │     │pre-signed│    │ to S3  │     │ Provider │     │ result │
│         │     │  URL    │     │directly│     │ (OCR)   │     │to client│
└────────┘     └─────────┘     └────────┘     └──────────┘     └────────┘
                (API call)      (client-side)   (API call)       │
                                                                 ▼
                                                          ┌──────────┐
                                                          │ Pre-filled│
                                                          │   form    │
                                                          │ (review)  │
                                                          └──────────┘
                                                                 │
                                                          ┌──────────┐
                                                          │  Delete   │
                                                          │ from S3   │
                                                          └──────────┘
```

**Why pre-signed URLs?**

- Receipt images never pass through the API server — reduces bandwidth and latency
- S3 handles the upload directly, with size and content-type restrictions set in the pre-signed URL
- The API server only handles metadata and the AI extraction call

**S3 lifecycle policy:** Objects in the receipt bucket auto-delete after 24 hours as a safety net, even if the application-level deletion fails.

---

## 8. Bank Statement Processing Pipeline

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│ Select  │────▶│ Upload   │────▶│  Parse   │────▶│  Match    │────▶│  Display │
│  PDF    │     │ to server│     │  PDF     │     │ against   │     │  results │
│         │     │          │     │          │     │ existing  │     │ (3 groups)│
└────────┘     └──────────┘     └──────────┘     └───────────┘     └──────────┘
                                     │
                              ┌──────┴──────┐
                              │  Bank-specific│
                              │  parser or   │
                              │  AI fallback │
                              └─────────────┘
```

**Two parsing strategies:**

1. **Bank-specific parsers** — regex/template-based parsers for target banks (Nubank, Itaú, Bradesco, Chase, Bank of America). Higher accuracy, but brittle to format changes.
2. **AI fallback** — send PDF pages as images to a vision AI for extraction. Lower accuracy but works with any bank. Used when no specific parser matches.

The system attempts bank identification first (by PDF metadata or header patterns), then selects the appropriate parser. If no match, falls back to AI.

---

## 9. Recurring Payment Scheduler

A scheduled job runs daily (configurable) and processes all active recurring rules:

```
Daily Job (e.g., 6:00 AM UTC)
│
├── Query all active rules where next_due_date <= today
│
├── For each rule:
│   ├── If auto_post = true → create confirmed transaction
│   ├── If auto_post = false → create pending transaction
│   ├── Calculate and update next_due_date based on cycle_type
│   └── Send push notification (if pending review)
│
└── Back-fill check: if any rules have next_due_date < today
    (missed due to downtime), generate all missed transactions
```

**Implementation:** Starts as a simple `setInterval` or `Bun.cron` within the API server process. If reliability becomes a concern, moves to a dedicated worker or SQS-triggered Lambda.

---

## 10. Push Notification Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Trigger │────▶│  Build   │────▶│ FCM / APNs   │────▶│  Device  │
│  Event   │     │ Payload  │     │  (via server  │     │          │
│          │     │          │     │   SDK)        │     │          │
└──────────┘     └──────────┘     └──────────────┘     └──────────┘
```

**Triggers:** recurring payment due, budget 80%/100%, receipt processed, statement processed.

**Device token management:**

- Mobile app registers device token on login and refreshes on app open
- Tokens stored in `device_token` table (user can have multiple devices)
- Stale tokens cleaned up on FCM/APNs error response

---

## 11. Deployment

### 11.1 Initial Setup (Simple)

```
┌──────────────────────────────────┐
│         Cloud Provider            │
│  (Railway, Fly.io, or AWS)       │
│                                   │
│  ┌─────────────┐  ┌───────────┐  │
│  │ Hono Server │  │ PostgreSQL│  │
│  │ (container) │──│ (managed) │  │
│  └─────────────┘  └───────────┘  │
│         │                         │
│         │── AWS S3 (receipt imgs) │
│                                   │
└──────────────────────────────────┘
```

### 11.2 Scaled Setup (When Needed)

```
┌──────────────────────────────────────────────┐
│              AWS / Cloud Provider              │
│                                                │
│  ┌──────────┐     ┌──────────┐                │
│  │ API (x2) │────▶│ Postgres │                │
│  │ behind LB│     │ (RDS)    │                │
│  └──────────┘     └──────────┘                │
│       │                                        │
│       ├──▶ Redis (sessions/cache)              │
│       ├──▶ SQS (async jobs)                    │
│       ├──▶ S3 (receipt images)                 │
│       └──▶ Worker (SQS consumer for OCR/PDF)   │
│                                                │
└──────────────────────────────────────────────┘
```

**Scaling triggers:**

- Redis: when session lookups or rate limiting performance degrades
- SQS + Worker: when receipt/statement processing blocks API response times
- Multiple API instances: when single instance can't handle request volume

---

## 12. Development Workflow

| Concern            | Approach                                                  |
| ------------------ | --------------------------------------------------------- |
| Package manager    | Bun (workspace support)                                   |
| Monorepo tool      | Turborepo                                                 |
| Linting            | Biome (fast, replaces ESLint + Prettier)                  |
| Testing (API)      | Bun test runner + Supertest for integration tests         |
| Testing (Mobile)   | Jest + React Native Testing Library                       |
| Database (local)   | Docker Compose with PostgreSQL                            |
| API development    | Hono dev server with hot reload via Bun                   |
| Mobile development | Expo Dev Client for iOS/Android simulators                |
| Git workflow       | Feature branches → PR → main; squash merge                |
| CI                 | GitHub Actions: lint → test → build on every PR           |
| CD                 | Auto-deploy main to staging; manual promote to production |

---

## 13. Key Technical Decisions Log

| Decision         | Choice                   | Alternatives Considered    | Rationale                                                                                                      |
| ---------------- | ------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| State management | TanStack Query + Zustand | Redux, Jotai, MobX         | TanStack Query handles server state (caching, refetch, sync) excellently; Zustand is minimal for UI-only state |
| ORM              | Drizzle                  | Prisma, Kysely             | Drizzle is lighter, SQL-like, better Bun compatibility, no heavy engine binary                                 |
| Validation       | Zod                      | Yup, Joi, Valibot          | Zod is TypeScript-first, works in both client and server, best ecosystem integration                           |
| Monorepo tool    | Turborepo                | Nx, Lerna                  | Simpler config, fast caching, good Bun support                                                                 |
| Auth             | Custom JWT               | BetterAuth, Auth.js, Clerk | Full control over token lifecycle; social sign-in is straightforward with provider SDKs                        |
| Linter/Formatter | Biome                    | ESLint + Prettier          | Single tool, significantly faster, less config                                                                 |
| File upload      | Pre-signed S3 URLs       | Multipart through API      | Offloads bandwidth from API server; scales independently                                                       |
| IDs              | UUIDs                    | CUID, ULID, auto-increment | Standard, no ordering leakage, native Postgres support                                                         |
