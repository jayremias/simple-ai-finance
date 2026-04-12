# Sharing Flow Integration Tests

End-to-end integration test that validates the complete multi-user journey: account creation, transactions, invitation, acceptance, access control (read vs write), role changes, and access revocation.

**Test file**: `apps/api/src/routes/__tests__/sharing-flow.test.ts`

## Test Results Summary

| Total | Pass | Fail |
|-------|------|------|
| 48    | 36   | 12   |

All 12 failures are for **features not yet implemented**. Zero regressions in existing tests (170 pass).

### Failure Categories

| Category | Tests | Feature needed |
|---|---|---|
| Sharing routes | 3 | `POST /api/v1/sharing/invite`, `DELETE /api/v1/sharing/:id` |
| Notification routes | 2 | `GET /api/v1/notifications`, `POST /api/v1/notifications/:id/accept` |
| Per-account editor roles | 4 | `team_member.role` column + `resolveUserAccountRole` update |
| Cascading from above | 2 | Fixes itself when per-account editor roles work |
| Sharing edge cases | 1 | Self-invite prevention, duplicate detection |

---

## Test Actors

| Actor | Description |
|---|---|
| **User1** | Owner of their personal org. Creates accounts and transactions. Invites User2. |
| **User2** | Owner of their own separate org. Gets invited to User1's accounts with varying roles. |

---

## Phase 1: Setup

Creates both users and two financial accounts in User1's org.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1 | Create user1 with org | User + org + session created | PASS |
| 2 | Create user2 with their own org | User + org + session created | PASS |
| 3 | User1 creates Account-A (checking) | 201, account returned | PASS |
| 4 | User1 creates Account-B (savings) | 201, account returned | PASS |

---

## Phase 2: Populate Accounts

User1 adds transactions to both accounts: expenses, incomes, and cross-account transfers.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5 | User1 adds 2 expenses to Account-A ($50, $30) | Both 201 | PASS |
| 6 | User1 adds 2 incomes to Account-A ($1000, $200) | Both 201 | PASS |
| 7 | User1 transfers $100 from Account-A to Account-B | 201, creates linked pair | PASS |
| 8 | User1 adds 2 expenses to Account-B ($20, $15) | Both 201 | PASS |
| 9 | User1 adds 2 incomes to Account-B ($500, $150) | Both 201 | PASS |
| 10 | User1 transfers $50 from Account-B to Account-A | 201, creates linked pair | PASS |
| 11 | Account-A has 6 transactions (5 direct + 1 inbound transfer) | count = 6 | PASS |
| 12 | Account-B has 6 transactions (5 direct + 1 inbound transfer) | count = 6 | PASS |

---

## Phase 3: Invite User2 to Account-A as Viewer

Tests the sharing invitation API (not yet implemented).

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 13 | User1 invites user2 to Account-A with viewer role | `POST /sharing/invite` returns 201 | FAIL | Sharing routes not implemented |

---

## Phase 4: User2 Checks Notifications and Accepts

Tests the notification system for invitation acceptance (not yet implemented).

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 14 | User2 sees pending invitation in notifications | `GET /notifications` returns invitation with status=pending | FAIL | Notification routes not implemented |
| 15 | User2 accepts the invitation | `POST /notifications/:id/accept` returns 200 | FAIL | Notification routes not implemented |

---

## Phase 5: User2 Verifies Viewer Access to Account-A

After simulating invitation acceptance via direct DB insert (team_member), validates that User2 can read the shared account but not the unshared one.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 16 | User2 can read Account-A | `GET /accounts/:id` returns 200 | PASS |
| 17 | User2 cannot read Account-B | `GET /accounts/:id` returns 403 | PASS |

---

## Phase 6: User2 Cannot Write as Viewer

Validates that viewer-level access blocks all write operations.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 18 | User2 cannot create transaction on Account-A | `POST /transactions` returns 403 | PASS |
| 19 | User2 cannot update Account-A | `PATCH /accounts/:id` returns 403 | PASS |
| 20 | User2 cannot delete Account-A | `DELETE /accounts/:id` returns 403 | PASS |

**Note**: Test 18 was previously passing silently (security gap). After adding `requireOrgMembership` to the transactions route, it now correctly returns 403.

---

## Phase 7: User1 Gives User2 Editor Access to Account-B

Tests per-account editor invitation (not yet implemented).

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 21 | User1 invites user2 to Account-B with editor role | `POST /sharing/invite` returns 201 | FAIL | Sharing routes not implemented |
| 22 | User2 accepts invitation via notifications | Accept flow works | FAIL | Notification routes not implemented |

---

## Phase 8: User2 Verifies Correct Access Levels

After simulating team membership for Account-B, validates differentiated access: viewer on A, editor on B.

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 23 | User2 can read Account-A (viewer) | 200 | PASS | |
| 24 | User2 can read Account-B (editor) | 200 | PASS | |
| 25 | User2 cannot create transaction on Account-A (viewer) | 403 | PASS | |
| 26 | User2 CAN create transaction on Account-B (editor) | 201 | FAIL | Per-account roles not implemented (team_member = viewer only) |
| 27 | User2 cannot delete Account-B (editor, not owner) | 403 | PASS | |

---

## Phase 9: User2 Adds Transaction on Account-B

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 28 | User2 creates an expense on Account-B | 201 | FAIL | Per-account editor roles not implemented |

---

## Phase 10: User1 Verifies All Entries

User1 checks that both accounts have the correct transaction counts including User2's contributions.

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 29 | Account-A still has original 6 transactions | count = 6 | PASS | |
| 30 | Account-B has original 6 + 2 from user2 = 8 | count = 8 | FAIL | Cascading: user2 can't create yet |
| 31 | User2 transactions appear with correct data | 2 matching payees | FAIL | Cascading: user2 can't create yet |

---

## Phase 11: User1 Revokes User2's Access to Account-B

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 32 | User1 revokes user2 access via sharing route | `DELETE /sharing/:id` returns 200 | FAIL | Sharing routes not implemented |
| 33 | [Simulated] Remove user2 from Account-B team | Direct DB delete, then GET returns 403 | PASS | |

---

## Phase 12: User2 Remaining Access After Revocation

| # | Test | Expected | Status |
|---|------|----------|--------|
| 34 | User2 can still read Account-A (viewer access intact) | 200 | PASS |
| 35 | User2 cannot access Account-B (access revoked) | 403 | PASS |

---

## Phase 13: Organization Isolation

Validates that users in different orgs cannot see each other's data.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 36 | User2 creates an account in their own org | 201 | PASS |
| 37 | User1 cannot see user2's accounts | GET /accounts returns list without user2's account | PASS |
| 38 | User2 cannot see user1's accounts via list | GET /accounts returns list without user1's accounts | PASS |

---

## Phase 14: Category and Tag Isolation

| # | Test | Expected | Status |
|---|------|----------|--------|
| 39 | User1 creates a tag | 201 | PASS |
| 40 | User2 cannot see user1's tags | GET /tags returns empty (no user1 tags) | PASS |
| 41 | User2 cannot see user1's custom categories | GET /categories returns only default categories | PASS |

---

## Phase 15: Transfer Integrity

Validates that cross-account transfers create properly linked transaction pairs.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 42 | Transfers created linked pairs with matching transferId | Both sides share same transferId | PASS |
| 43 | Transfer amounts are correctly signed | Outflow = -10000, Inflow = +5000 | PASS |

---

## Phase 16: Edge Cases

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 44 | Unauthenticated user gets 401 | 401 | PASS | |
| 45 | User with no active org gets 400 | 400 BAD_REQUEST | PASS | |
| 46 | Transaction referencing account from another org | 403 or 404 | PASS | |
| 47 | User invites themselves | 400 | FAIL | Sharing routes not implemented |
| 48 | Inviting user who already has access | 409 | FAIL | Sharing routes not implemented |

---

## Security Findings

The test suite exposed a **security gap** that has since been fixed:

**Issue**: Routes using `requireActiveOrg` without `requireOrgMembership` did not verify the user was actually a member of the organization. A user who set `activeOrganizationId` to another org's ID could read/write data in that org.

**Affected routes**: transactions, categories, tags, recurring (all CRUD), accounts (list), statements (import).

**Fix applied**: Added `requireOrgMembership()` middleware to all org-scoped routes. The middleware queries the `member` table to verify the user has membership in the active organization before allowing access.

**Verification**: Test #18 ("user2 cannot create transaction on Account-A") now correctly returns 403. Previously, this operation succeeded silently.

---

## Features Required to Pass All Tests

### 1. Sharing Routes (`/api/v1/sharing`)

```
POST   /sharing/invite       { accountId, email, role }  -> 201
PATCH  /sharing/:id/role     { role }                    -> 200
DELETE /sharing/:id          { userId }                  -> 200
GET    /sharing/:accountId                               -> { members: [...] }
```

Validation rules:
- Cannot invite yourself (400)
- Cannot invite someone who already has access (409)
- Only account owners can invite/revoke

### 2. Notification Routes (`/api/v1/notifications`)

```
GET    /notifications                    -> { data: [...] }
POST   /notifications/:id/accept        -> 200
POST   /notifications/:id/decline       -> 200
```

### 3. Per-Account Roles

- Add `role` column to `team_member` table (default: `'viewer'`)
- Update `resolveUserAccountRole()` in `accounts.service.ts` to read `team_member.role` instead of always returning `'viewer'` for team members
- Transaction routes need per-account permission checks (editor+ to create/update/delete)
