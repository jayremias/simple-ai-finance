# Financial Accounts — Design Document

**Date**: 2026-03-03
**Status**: Approved
**Scope**: Backend vertical slice (no mobile screens)

## Problem

MoneyLens has no business domain features yet. Users need to create and manage financial accounts (checking, savings, credit cards, etc.) as the foundation for all transaction tracking.

## Architecture Decision: Better Auth Teams

Financial accounts leverage Better Auth's **organization + teams** hierarchy instead of custom access control tables:

```
User (owner)
  └── Organization (personal, auto-created on signup)
        └── Team (= financial account, 1:1 mapping)
              └── TeamMembers (owner + shared users)
```

### Why Teams?

- **Per-account sharing**: Add user as teamMember → access to one account
- **Share all accounts**: Add user as org member → access to all accounts
- **No custom `account_share` table**: Better Auth handles invitations, roles, revocation
- **Built-in invitation system**: Invite links, expiration, role assignment — all handled by BA

### Custom Roles (via BA Access Control)

| Role | Account | Transactions | Receipts | Statements |
|------|---------|-------------|----------|------------|
| **owner** | read, update, archive, delete | list, read, create, update, delete, split | upload, extract | upload, read |
| **editor** | read | list, read, create, update, delete, split | upload, extract | upload, read |
| **viewer** | read | list, read | — | read |

Defined using `createAccessControl` from `better-auth/plugins/access`.

## Data Model

### financial_account table

| Column | Type | Constraints |
|--------|------|------------|
| `id` | text (UUID) | PK, auto-generated |
| `team_id` | text | FK → team.id, cascade delete, NOT NULL |
| `organization_id` | text | FK → organization.id, cascade delete, NOT NULL |
| `name` | text | NOT NULL, 1-100 chars |
| `type` | text | NOT NULL, enum: checking, savings, credit_card, cash, investment |
| `currency` | text | NOT NULL, enum: BRL, USD (no default — user must pick) |
| `initial_balance` | integer | NOT NULL, default 0, stored in cents |
| `color` | text | nullable, hex color for UI |
| `icon` | text | nullable, icon identifier for UI |
| `status` | text | NOT NULL, default "active", enum: active, archived |
| `opened_at` | date | nullable, real-world account opening date |
| `sort_order` | integer | NOT NULL, default 0 |
| `created_at` | timestamp | NOT NULL, auto-set |
| `updated_at` | timestamp | NOT NULL, auto-set + auto-update |

**Indexes**: `team_id`, `organization_id`, `(organization_id, status)` composite.

### team table (Better Auth)

| Column | Type | Constraints |
|--------|------|------------|
| `id` | text | PK |
| `name` | text | NOT NULL |
| `organization_id` | text | FK → organization.id, cascade |
| `created_at` | timestamp | NOT NULL |
| `updated_at` | timestamp | NOT NULL |

### team_member table (Better Auth)

| Column | Type | Constraints |
|--------|------|------------|
| `id` | text | PK |
| `team_id` | text | FK → team.id, cascade |
| `user_id` | text | FK → user.id, cascade |
| `created_at` | timestamp | NOT NULL |

## Account Types

| Type | Description | Balance Behavior |
|------|-------------|-----------------|
| `checking` | Day-to-day bank accounts | Can go negative (overdraft) |
| `savings` | Savings and reserve accounts | Typically positive |
| `credit_card` | Credit card accounts | Negative = debt owed |
| `cash` | Physical cash tracking | Positive only |
| `investment` | Brokerage, retirement (balance tracking only) | Positive only |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/accounts` | requireAuth | Create account in user's active org |
| GET | `/api/v1/accounts` | requireAuth | List accounts in active org (filterable by status) |
| GET | `/api/v1/accounts/:id` | requireAuth | Get single account (verify team membership) |
| PATCH | `/api/v1/accounts/:id` | requireAuth | Update account (owner/admin only) |
| DELETE | `/api/v1/accounts/:id` | requireAuth | Delete account permanently (owner only) |

### Create Account Flow

1. Validate request body against `createAccountSchema`
2. Get user's `activeOrganizationId` from session
3. Create BA team via `auth.api.createTeam({ name, organizationId })`
4. Insert `financial_account` row with `teamId` from step 3
5. Return full account response

### Sharing Flow (future)

1. Owner calls BA's `addTeamMember({ teamId, userId })` → per-account sharing
2. Or owner adds user as org member → access to all accounts
3. Permissions checked via team/org membership + custom role definitions

## Shared Package

### Constants (`packages/shared/src/constants/account.ts`)

- `ACCOUNT_TYPES`: `["checking", "savings", "credit_card", "cash", "investment"]`
- `ACCOUNT_STATUSES`: `["active", "archived"]`
- `CURRENCIES`: `["BRL", "USD"]`

### Zod Schemas (`packages/shared/src/schemas/account.ts`)

- `createAccountSchema` — name, type, currency (all required), initial_balance, color, icon, opened_at (optional)
- `updateAccountSchema` — all fields optional, plus status
- `accountResponseSchema` — full shape for API responses
- `listAccountsQuerySchema` — status filter for query params

### Types (`packages/shared/src/types/account.ts`)

Inferred from Zod schemas: `CreateAccountInput`, `UpdateAccountInput`, `AccountResponse`.

## Key Behaviors

- **Balance calculation**: `initial_balance + SUM(transactions)` — never stored directly
- **Archive**: Hides from active list, preserves history, no new transactions
- **Delete**: Hard delete with cascade (removes all transactions, team, team members)
- **Currency**: Fixed per account — no default, user must choose BRL or USD
- **Sort order**: Manual integer for UI reordering
- **Personal org**: Auto-created on user signup — ensures every user has an org context

## Open Questions for Implementation

1. Verify BA's exact Drizzle schema expectations for team/teamMember tables (column names)
2. Confirm hook mechanism for auto-creating personal org on signup (`databaseHooks` vs event)
3. Verify `auth.api.createTeam()` works server-side without HTTP context
