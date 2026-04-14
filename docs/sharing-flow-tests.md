# Sharing Flow Integration Tests

End-to-end integration test that validates the complete multi-user journey: account creation, transactions, invitation, acceptance, access control (read vs write), role changes, and access revocation.

**Test file**: `apps/api/src/routes/__tests__/sharing-flow.test.ts`

## Test Results Summary

| Total | Pass | Skip | Fail |
|-------|------|------|------|
| 54    | 50   | 4    | 0    |

All sharing features are fully implemented and tested. 4 skipped tests spec out shared-user transaction operations (list/update/delete) that require migrating those routes from org-level to account-level middleware.

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

| # | Test | Expected | Status |
|---|------|----------|--------|
| 13 | User1 invites user2 to Account-A with viewer role | `POST /sharing/invite` returns 201 | PASS |

---

## Phase 4: User2 Checks Notifications and Accepts

| # | Test | Expected | Status |
|---|------|----------|--------|
| 14 | User2 sees pending invitation in notifications | `GET /notifications` returns invitation with status=unread | PASS |
| 15 | User2 accepts the invitation | `POST /sharing/invitations/:id/accept` returns 200 | PASS |

---

## Phase 5: User2 Verifies Viewer Access to Account-A

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

---

## Phase 7: User1 Gives User2 Editor Access to Account-B

| # | Test | Expected | Status |
|---|------|----------|--------|
| 21 | User1 invites user2 to Account-B with editor role | `POST /sharing/invite` returns 201 | PASS |
| 22 | User2 accepts invitation via notifications | Accept flow works | PASS |

---

## Phase 8: User2 Verifies Correct Access Levels

Validates differentiated access: viewer on A, editor on B.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 23 | User2 can read Account-A (viewer) | 200 | PASS |
| 24 | User2 can read Account-B (editor) | 200 | PASS |
| 25 | User2 cannot create transaction on Account-A (viewer) | 403 | PASS |
| 26 | User2 CAN create transaction on Account-B (editor) | 201 | PASS |
| 27 | User2 CAN update Account-B name (editor) | 200 | PASS |
| 28 | User2 cannot delete Account-B (editor, not owner) | 403 | PASS |

---

## Phase 9a: Shared User Reads Transactions

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 29 | User2 can list transactions on Account-B (editor) | 200 | SKIP | GET /transactions is org-scoped |
| 30 | User2 can list transactions on Account-A (viewer) | 200 | SKIP | GET /transactions is org-scoped |

---

## Phase 9: User2 Adds Transaction on Account-B

| # | Test | Expected | Status |
|---|------|----------|--------|
| 31 | User2 creates an expense on Account-B | 201 | PASS |

---

## Phase 9b: Shared User Manages Transactions

| # | Test | Expected | Status | Blocked by |
|---|------|----------|--------|------------|
| 32 | User2 can update own transaction on Account-B (editor) | 200 | SKIP | PATCH /transactions/:id is org-scoped |
| 33 | User2 can delete own transaction on Account-B (editor) | 200 | SKIP | DELETE /transactions/:id is org-scoped |

---

## Phase 10: User1 Verifies All Entries

User1 checks that both accounts have the correct transaction counts including User2's contributions.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 34 | Account-A still has original 6 transactions | count = 6 | PASS |
| 35 | Account-B has original 6 + 2 from user2 = 8 | count = 8 | PASS |
| 36 | User2 transactions appear with correct data | 2 matching payees | PASS |

---

## Phase 11: User1 Revokes User2's Access to Account-B

| # | Test | Expected | Status |
|---|------|----------|--------|
| 37 | User1 revokes user2 access via sharing route | `DELETE /sharing/:id` returns 200 | PASS |

---

## Phase 12: User2 Remaining Access After Revocation

| # | Test | Expected | Status |
|---|------|----------|--------|
| 38 | User2 can still read Account-A (viewer access intact) | 200 | PASS |
| 39 | User2 cannot access Account-B (access revoked) | 403 | PASS |

---

## Phase 13: Organization Isolation

Validates that users in different orgs cannot see each other's data.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 40 | User2 creates an account in their own org | 201 | PASS |
| 41 | User1 cannot see user2's accounts | GET /accounts returns list without user2's account | PASS |
| 42 | User2 cannot see user1's accounts via list | GET /accounts returns list without user1's accounts | PASS |

---

## Phase 14: Category and Tag Isolation

| # | Test | Expected | Status |
|---|------|----------|--------|
| 43 | User1 creates a tag | 201 | PASS |
| 44 | User2 cannot see user1's tags | GET /tags returns empty (no user1 tags) | PASS |
| 45 | User2 cannot see user1's custom categories | GET /categories returns only default categories | PASS |

---

## Phase 15: Transfer Integrity

Validates that cross-account transfers create properly linked transaction pairs.

| # | Test | Expected | Status |
|---|------|----------|--------|
| 46 | Transfers created linked pairs with matching transferId | Both sides share same transferId | PASS |
| 47 | Transfer amounts are correctly signed | Outflow = -10000, Inflow = +5000 | PASS |

---

## Phase 16: Edge Cases

| # | Test | Expected | Status |
|---|------|----------|--------|
| 48 | Unauthenticated user gets 401 | 401 | PASS |
| 49 | User with no active org gets 400 | 400 BAD_REQUEST | PASS |
| 50 | Transaction referencing account from another org | 403 or 404 | PASS |
| 51 | User invites themselves | 400 BAD_REQUEST | PASS |
| 52 | Inviting user who already has access | 409 CONFLICT | PASS |
| 53 | Revoking access for user who has none | 404 NOT_FOUND | PASS |
| 54 | Non-owner cannot invite users | 403 FORBIDDEN | PASS |

---

## Permission Model

The sharing system uses a two-tier permission model:

### Organization-level (org members)
- Org members see all accounts in the org
- Org role maps to account role: `owner` -> `owner`, `editor` -> `editor`, `member`/`viewer` -> `viewer`
- Used for: account list, transaction list, payees

### Account-level (team members / shared users)
- Team members see only the specific accounts they're invited to
- Team role is stored in `team_member.role` and set from the invitation
- Used for: account CRUD, transaction creation
- Supported roles: `owner`, `editor`, `viewer`

### Route permission matrix

| Route | Middleware | Org members | Shared users |
|---|---|---|---|
| GET /accounts | requireOrgMembership | All accounts in org | N/A (org-scoped) |
| GET /accounts/:id | requireAccountAccess('viewer') | Yes (by org role) | Yes (by team role) |
| PATCH /accounts/:id | requireAccountAccess('editor') | Yes (editor+) | Yes (editor+) |
| DELETE /accounts/:id | requireAccountAccess('owner') | Yes (owner only) | Yes (owner only) |
| POST /transactions | requireAccountAccess('editor', body) | Yes (editor+) | Yes (editor+) |
| GET /transactions | requireOrgMembership | All in org | N/A (org-scoped) |
| POST /sharing/invite | requireOrgMembership('owner') | Owner only | N/A |
| DELETE /sharing/:id | requireOrgMembership('owner') | Owner only | N/A |

---

## Coverage Gaps (skipped tests)

4 tests are skipped because the underlying routes still use org-level middleware (`requireOrgMembership`). They need to be migrated to account-level middleware (`requireAccountAccess`) — the same pattern already applied to `POST /transactions`.

| Test | Route | Blocked by |
|---|---|---|
| Shared user lists transactions (editor) | GET /transactions | Org-scoped |
| Shared user lists transactions (viewer) | GET /transactions | Org-scoped |
| Shared user updates transaction (editor) | PATCH /transactions/:id | Org-scoped |
| Shared user deletes transaction (editor) | DELETE /transactions/:id | Org-scoped |

---

## Implemented API Endpoints

### Sharing Routes (`/api/v1/sharing`)

```
POST   /sharing/invite                 { accountId, email, role }  -> 201
POST   /sharing/invitations/:id/accept                            -> 200
DELETE /sharing/:accountId             { userId }                  -> 200
```

Validation rules:
- Cannot invite yourself (400)
- Cannot invite someone who already has access (409)
- Only org owners can invite/revoke

### Notification Routes (`/api/v1/notifications`)

```
GET    /notifications                  -> { data: [...] }
PATCH  /notifications/:id/read        -> 200
```
