# MoneyLens — Product Requirements Document (Mobile)

> **Version:** 1.0
> **Last Updated:** February 28, 2026
> **Status:** Draft
> **Platform:** Mobile-first (iOS + Android)

---

## 1. Overview

### 1.1 What is MoneyLens?

MoneyLens is a mobile-first personal finance application that helps users track accounts, expenses, income, and subscriptions across multiple financial accounts. It combines manual entry with AI-powered receipt scanning and bank statement import to minimize data entry friction.

### 1.2 Why Build This?

Most finance apps fall into two camps: feature-rich but clunky (Mint, Firefly III), or polished but locked into cloud ecosystems with limited control (Monarch Money, YNAB). MoneyLens targets the middle ground — a clean, fast mobile experience with smart automation (receipt scanning, statement import) while keeping the user in full control of categorization and review.

### 1.3 Target User

- Individuals who track personal finances manually or semi-manually
- Users managing multiple account types (checking, credit cards, savings, cash, investments)
- Households that want to share visibility into specific accounts (e.g., joint savings)
- Users in Brazil and/or the US dealing with BRL and USD

### 1.4 Core Principles

1. **Mobile-first** — The primary experience is on the phone. Every interaction is designed for touch, speed, and one-handed use.
2. **Low friction data entry** — Receipt scanning, statement import, and smart defaults reduce the time to log a transaction to under 10 seconds.
3. **User is always in control** — AI extracts data, but the user reviews and confirms. No silent auto-posting without explicit opt-in.
4. **Incremental build** — The PRD describes the full vision. Implementation is phased, with each feature delivered as a complete, usable increment.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile | React Native | Cross-platform iOS + Android from a single codebase |
| UI Framework | Tamagui | Performant, themeable component library for React Native |
| Backend | Hono (on Bun) | Lightweight, fast, TypeScript-native API framework optimized for Bun runtime |
| Runtime | Bun | Fast JavaScript runtime, built-in bundler, native TypeScript support |
| Database | PostgreSQL | Reliable, mature, excellent for financial data with strong typing |
| Object Storage | AWS S3 | Temporary receipt image storage during AI processing |
| Queue | AWS SQS | Async job processing (receipt OCR, statement parsing) — added when needed |
| Payments | Stripe | Subscription management and billing (added at the end, not in initial build) |
| AI/OCR | TBD | Receipt data extraction and bank statement parsing (OpenAI Vision, AWS Textract, or Google Vision — to be evaluated) |
| Push Notifications | FCM + APNs | Firebase Cloud Messaging for Android, Apple Push Notification service for iOS |

### 2.1 API-First Architecture

The backend is a standalone Hono API, completely decoupled from the mobile client. This enables:

- A web application to be built post-launch against the same API
- Third-party integrations or automation via the same endpoints
- Independent scaling of API and mobile client

### 2.2 Queue Strategy

AWS SQS is included in the stack but will only be introduced when async processing is needed (receipt OCR, statement parsing). Until then, synchronous processing or simple background jobs within the Hono server are sufficient. The architecture should be designed so that swapping in SQS later requires no changes to the API layer.

---

## 3. Security

### 3.1 Authentication

| Method | Details |
|---|---|
| Email + Password | Registration and login with email verification |
| Google Sign-In | OAuth 2.0 via Google |
| Apple Sign-In | Required for iOS App Store compliance |
| Password Reset | Email-based reset flow (requires SMTP or transactional email service) |
| Account Deletion | Full data wipe — required by Apple App Store and GDPR |

### 3.2 Session & Token Management

- JWT-based authentication with short-lived access tokens and refresh tokens
- Access token expiry: 15 minutes
- Refresh token expiry: 30 days (configurable)
- Refresh token rotation on each use
- Tokens stored securely on device (iOS Keychain / Android Keystore)

### 3.3 Data Security

| Concern | Approach |
|---|---|
| Passwords | Hashed with Argon2id (or bcrypt as fallback) |
| Data in transit | TLS/HTTPS enforced on all API endpoints |
| Data at rest | PostgreSQL with encrypted storage volumes |
| Receipt images | Uploaded to S3 with pre-signed URLs, deleted after AI extraction completes |
| API rate limiting | Per-user rate limits on sensitive endpoints (auth, receipt upload) |
| Input validation | Strict schema validation on all API inputs (Zod or similar) |

### 3.4 Receipt Image Lifecycle

1. User captures/uploads receipt image
2. Image uploaded to S3 via pre-signed URL (never passes through API server)
3. AI service processes the image and extracts transaction data
4. Extracted data returned to user for review
5. Image deleted from S3 after extraction completes (no permanent storage)
6. If extraction fails, image is retained for 24 hours for retry, then deleted

---

## 4. Features

### 4.1 Authentication & User Management

**Priority:** P0 — Must Have
**Phase:** 1

Users create an account, log in, and manage their profile.

**Requirements:**

- Email + password registration with email verification
- Google and Apple social sign-in
- Password reset via email
- Profile management: name, avatar, default currency (BRL or USD), locale (pt-BR, en-US)
- Account deletion with complete data wipe
- Secure token storage on device

**Acceptance Criteria:**

- User can register, verify email, log in, and log out
- Social sign-in completes in a single flow without extra steps
- Password reset email arrives within 60 seconds
- Account deletion removes all user data from the database within 24 hours

---

### 4.2 Account Management

**Priority:** P0 — Must Have
**Phase:** 2

Users manage multiple financial accounts representing their real-world bank accounts, cards, and cash.

**Account Types:**

| Type | Description | Balance Behavior |
|---|---|---|
| Checking | Day-to-day bank accounts | Can go negative (overdraft) |
| Savings | Savings and reserve accounts | Typically positive |
| Credit Card | Credit card accounts | Negative = debt owed |
| Cash | Physical cash tracking | Positive only |
| Investment | Brokerage, retirement (balance tracking only) | Positive only |

**Requirements:**

- Create, edit, archive, and delete accounts
- Each account has: name, type, currency (BRL or USD), initial balance, color, icon, active/archived status
- Account list on dashboard showing current balances
- Balance is auto-calculated: initial balance + sum of all transactions
- Archive hides account from active views but preserves history
- Sort/reorder accounts manually

**Acceptance Criteria:**

- User can create accounts of each type
- Balances are accurate and reflect all posted transactions
- Archived accounts do not appear in the main account list but are accessible via a filter

---

### 4.3 Transaction Management

**Priority:** P0 — Must Have
**Phase:** 2

Core transaction tracking for income, expenses, and transfers.

**Transaction Types:**

| Type | Description |
|---|---|
| Income | Money received (salary, freelance, gifts, etc.) |
| Expense | Money spent (purchases, bills, fees, etc.) |
| Transfer | Money moved between the user's own accounts |

**Requirements:**

- Create, edit, and delete transactions
- Fields: date, amount, currency, type, category, account, payee/description, notes, tags
- Transfers create two linked entries (debit from source, credit to destination) — same currency only for v1
- Quick-add: floating action button (FAB) for fast transaction entry
- Search and filter: by date range, account, category, type, amount range, text search
- Pagination for transaction lists
- Duplicate detection: warn if same amount + date + payee exists within 24 hours
- Transaction splitting: one transaction mapped to multiple categories with individual amounts

**Acceptance Criteria:**

- Adding a transaction updates the account balance immediately
- Transfers between accounts reflect correctly on both sides
- Search returns results within 300ms for datasets up to 50,000 transactions
- Splitting a transaction shows category breakdown and amounts sum to the total

---

### 4.4 Categories & Tags

**Priority:** P0 — Must Have
**Phase:** 2

Organize transactions with hierarchical categories and flat tags.

**Requirements:**

- Pre-seeded default categories on account creation:
  - Housing, Food & Dining, Transportation, Health & Fitness, Entertainment, Shopping, Subscriptions, Utilities, Education, Travel, Personal Care, Gifts & Donations, Taxes & Fees, Income (with subcategories: Salary, Freelance, Investment Returns, Other)
- Each default category includes subcategories (e.g., Food & Dining → Groceries, Restaurants, Delivery, Coffee)
- User can create, edit, delete, and reorder categories
- Parent/child category hierarchy (one level deep)
- Category icon and color customization
- Tags are flat labels, user-created, with autocomplete suggestions
- A transaction has exactly one category and zero or more tags

**Acceptance Criteria:**

- New users see pre-seeded categories immediately after registration
- Deleting a category prompts the user to reassign or archive existing transactions
- Tag autocomplete shows suggestions after 2 characters

---

### 4.5 Recurring Payments & Subscriptions

**Priority:** P0 — Must Have
**Phase:** 3

Track subscriptions and recurring bills. Some are fixed (Netflix), others are variable (electricity bill) and need confirmation.

**Requirements:**

- Create recurring rules with: payee, account, category, amount (fixed or estimated), currency, cycle configuration, start date, optional end date
- Cycle options: weekly, biweekly, monthly, bimonthly, quarterly, semi-annual, annual, custom (every N days)
- Two posting modes:
  - **Auto-post:** Transaction created automatically on due date (for fixed amounts)
  - **Pending review:** Transaction created as "pending" — user confirms or adjusts the actual amount (for variable amounts like utility bills)
- Dashboard section showing upcoming payments for the next 7/14/30 days
- Notification indicator for pending payments that need review
- Pause/resume recurring payments without deleting
- History view: all past instances generated by a recurring rule
- Push notification on due date for pending review items

**Acceptance Criteria:**

- A scheduled job generates recurring transactions daily
- Pending transactions are visually distinct in the transaction list
- User can adjust amount and date before confirming a pending transaction
- Missed payments (server downtime) are back-filled on next job run
- Paused rules do not generate any transactions

---

### 4.6 Receipt Scanning (AI-Powered)

**Priority:** P0 — Must Have
**Phase:** 3

Users photograph or upload receipts. AI extracts transaction data and pre-fills the entry form.

**Requirements:**

- Capture receipt via camera or select from photo library
- Upload image to S3 via pre-signed URL (no server pass-through)
- AI processes the image and extracts: total amount, date, payee/store name, individual line items (if available)
- Extracted data populates a pre-filled transaction form
- User reviews the form: can edit any field before confirming
- "Looks good" button to accept extracted data as-is (auto-review)
- Category suggestion based on payee name (simple keyword matching in v1)
- Error handling: if extraction fails or is low-confidence, show what was extracted with highlighted uncertain fields
- Receipt image is not stored permanently — deleted from S3 after extraction

**AI Provider Evaluation Criteria:**

| Criteria | Weight |
|---|---|
| Accuracy on receipts (Portuguese + English) | High |
| Latency (target: < 5 seconds) | High |
| Cost per extraction | Medium |
| Data privacy / retention policy | Medium |
| Line item extraction capability | Low (nice-to-have for v1) |

**Acceptance Criteria:**

- Receipt scanning works for standard printed receipts in Portuguese and English
- Extraction accuracy > 80% for amount, date, and payee on clear photos
- User sees the pre-filled form within 5 seconds of upload
- If AI cannot extract any data, user is notified and can enter manually
- No receipt images remain in S3 after 24 hours

---

### 4.7 Bank Statement Import (PDF)

**Priority:** P0 — Must Have
**Phase:** 4

Users upload bank/credit card statement PDFs. The system parses transactions and identifies entries not yet in the app.

**Requirements:**

- Upload PDF statement from device storage
- Parse PDF to extract transaction list (date, description, amount, type)
- Match parsed transactions against existing entries in the selected account
- Matching logic: amount + date + normalized description similarity
- Display results in three groups:
  - **Already tracked:** matched to existing transactions (no action needed)
  - **Missing:** found in statement but not in app (user can add)
  - **Extra:** in app but not in statement (possible error — flag for review)
- User can bulk-add missing transactions with one tap or review individually
- Pre-fill category based on description keywords
- Target banks for highest accuracy (v1): Nubank, Itaú, Bradesco, Chase, Bank of America
- Accept PDFs from any bank with best-effort parsing
- Clear error messaging when a PDF format is not recognized or parsing fails

**Acceptance Criteria:**

- Target bank statements parse with > 90% transaction extraction accuracy
- Non-target bank statements attempt parsing with clear confidence indicators
- Matched transactions are not duplicated
- User can review and edit each imported transaction before confirming
- Processing completes within 15 seconds for statements with up to 200 transactions

---

### 4.8 Account Sharing

**Priority:** P1 — Should Have
**Phase:** 4

Users can share one or more financial accounts with other MoneyLens users.

**Requirements:**

- Share an account with another user via invite link
- Invite link is single-use and expires after 7 days
- Permission levels:
  - **Read-only:** Can view account balance, transactions, and history
  - **Read/Write:** Can also add, edit, and delete transactions on the shared account
- Account owner can revoke access at any time
- Shared users see shared accounts in a separate "Shared with me" section
- Sharing is per-account, not per-user (share savings but not checking)

**Nice-to-have (deferred):**

- Push notification when someone adds a transaction to a shared account
- Activity log showing who added/edited what on shared accounts

**Acceptance Criteria:**

- Invite link works and grants the correct permission level
- Shared user can only perform actions allowed by their permission level
- Revoking access immediately removes the shared account from the other user's view
- Account owner sees a list of who has access to each shared account

---

### 4.9 Budget System

**Priority:** P1 — Should Have
**Phase:** 5

Set spending limits per category and track actual spending against budgets.

**Requirements:**

- Create budgets per category with a monthly limit
- Budget period: monthly (primary use case)
- Budget overview: progress bars showing spent vs. budgeted per category
- Overspend behavior options per budget:
  - **Carry over:** Overspend reduces next month's available amount
  - **Reset:** Each month starts fresh
- Underspend behavior options per budget:
  - **Roll over:** Unused amount adds to next month
  - **Reset:** Unused amount does not carry
- Budget summary: total budgeted, total spent, remaining
- Push notification when spending reaches 80% and 100% of a budget

**Acceptance Criteria:**

- Budget progress updates immediately when transactions are added
- Rollover calculations are correct across month boundaries
- Budget overview is scannable on a single screen for up to 15 categories

---

### 4.10 Dashboard & Widgets

**Priority:** P0 — Must Have
**Phase:** 5

At-a-glance financial overview on the home screen of the app.

**Dashboard Sections:**

- **Net worth summary:** Total assets minus total liabilities with a simple trend indicator (up/down vs. last month)
- **Account balances:** List of active accounts grouped by type with current balance
- **Monthly snapshot:** Income vs. expenses for the current month (simple bar or summary)
- **Upcoming payments:** Next 7 days of recurring payments
- **Pending review:** Count of pending transactions needing confirmation (from recurring rules or receipt scans)
- **Recent transactions:** Last 5-10 transactions

**Requirements:**

- Dashboard is the landing screen after login
- Pull-to-refresh to update all data
- Tapping any section navigates to the detailed view
- Loads within 1 second for datasets up to 50,000 transactions

**Acceptance Criteria:**

- Dashboard renders all sections without scrolling on standard phone screens (iPhone 14/15 size, or with minimal scroll)
- All data is current and reflects the latest transactions
- Navigation from dashboard to detail views is intuitive

---

### 4.11 Reports

**Priority:** P1 — Should Have
**Phase:** 5

Simple, visual reports for understanding spending patterns.

**v1 Reports:**

- **Income vs. Expenses:** Monthly bar chart for the current year
- **Spending by Category:** Pie or donut chart for a selected month
- **Account Balance Summary:** Current balance of all accounts in a single view

**Requirements:**

- Date range selector for each report (default: current month or current year)
- Charts are interactive: tap a segment for details
- Reports display in the user's base currency
- Clean, readable visualizations optimized for mobile screens

**Nice-to-have (deferred):**

- Category trends over time (line chart)
- Net worth over time (area chart)
- Cash flow breakdown
- CSV/PDF export
- Custom date ranges

**Acceptance Criteria:**

- Reports render correctly on both iOS and Android
- Charts are legible on screens 5.5" and above
- Report data matches transaction totals exactly

---

### 4.12 Multi-Currency Support

**Priority:** P1 — Should Have
**Phase:** 2

Support for BRL and USD accounts.

**Requirements:**

- Each account has a fixed currency: BRL or USD
- Transactions are recorded in the account's currency
- User selects a base/display currency in settings (BRL or USD)
- Dashboard and reports display totals in the base currency
- Manual exchange rate entry for currency conversion in reports (no auto-fetch in v1)
- Cross-currency transfers are out of scope for v1

**Acceptance Criteria:**

- A user with BRL and USD accounts sees a combined net worth in their chosen base currency
- Exchange rate for report conversion is user-configurable
- Changing base currency recalculates all report displays

---

### 4.13 Push Notifications

**Priority:** P1 — Should Have
**Phase:** 5

Timely notifications to keep the user engaged and informed.

**Notification Types:**

| Notification | Trigger |
|---|---|
| Recurring payment due | Day of due date for pending review items |
| Budget warning | Spending reaches 80% of a category budget |
| Budget exceeded | Spending reaches 100% of a category budget |
| Receipt processed | AI extraction complete, ready for review |
| Statement processed | PDF parsing complete, results ready |

**Requirements:**

- FCM for Android, APNs for iOS
- User can enable/disable each notification type in settings
- Notifications are non-intrusive and actionable (tapping opens the relevant screen)

**Nice-to-have (deferred):**

- Shared account activity notifications
- Weekly spending summary digest
- Goal progress milestones

**Acceptance Criteria:**

- Notifications arrive within 60 seconds of the trigger event
- Tapping a notification navigates directly to the relevant screen
- Users can granularly control which notifications they receive

---

### 4.14 Dark/Light Theme

**Priority:** P1 — Should Have
**Phase:** 1

**Requirements:**

- Three modes: Light, Dark, System (follows OS preference)
- Theme toggle in settings
- All UI components and charts respect the active theme
- Theme preference persisted per user
- Tamagui handles theming natively

**Acceptance Criteria:**

- No readability issues in either theme
- Charts adapt colors for both themes
- Theme applies immediately without app restart

---

## 5. Subscription & Monetization (Stripe)

**Priority:** P2 — Nice to Have
**Phase:** Final (built after all core features)

**Model:** Freemium with monthly subscription

**Free Tier (tentative limits):**

- Up to 2 financial accounts
- Up to 100 transactions per month
- 5 receipt scans per month
- 1 statement import per month
- Basic reports only
- No account sharing

**Premium Tier (tentative):**

- Unlimited accounts
- Unlimited transactions
- Unlimited receipt scans
- Unlimited statement imports
- All reports
- Account sharing
- Priority support

**Requirements:**

- Stripe integration for subscription management
- In-app purchase flow for iOS (Apple requirement) and Google Play
- Graceful feature gating: free users see locked features with upgrade prompts
- Downgrade handling: if subscription lapses, limit to free tier without deleting data
- Architecture must support tier enforcement from the beginning (even if Stripe is added last), via a user `tier` field and middleware checks

**Acceptance Criteria:**

- Subscription purchase, renewal, and cancellation work on both platforms
- Free tier limits are enforced correctly
- Downgrade does not delete any user data
- User can manage subscription from app settings

---

## 6. Database Schema (High-Level)

### Core Tables

| Table | Purpose |
|---|---|
| `user` | User profile, auth, preferences |
| `financial_account` | Checking, savings, credit card, cash, investment |
| `transaction` | Income, expense, transfer entries |
| `transaction_split` | Category splits for a single transaction |
| `category` | Hierarchical transaction categories |
| `tag` | Flat labels for transactions |
| `transaction_tag` | Many-to-many join: transaction ↔ tag |
| `recurring_rule` | Subscription and recurring payment definitions |
| `budget` | Monthly spending limits per category |
| `budget_period` | Period tracking with rollover calculations |
| `exchange_rate` | Manual exchange rates for currency conversion |
| `account_share` | User-to-user account sharing with permissions |
| `device_token` | Push notification tokens per user per device |

### Key Relationships

- A user has many financial accounts, categories, tags, budgets, and recurring rules
- A financial account has many transactions
- A transaction belongs to one category and has many tags (via join table)
- A transaction can be split into multiple transaction_splits (each with its own category)
- A recurring rule generates many transactions
- A budget tracks one category over multiple budget_periods
- An account_share links a financial_account to another user with a permission level

### Data Types

- All monetary amounts stored as **integers in cents** (avoids floating-point precision issues)
- Dates stored as `date` type (no time component for transaction dates)
- Timestamps stored as `timestamptz` for audit fields (created_at, updated_at)
- UUIDs for all primary keys
- User IDs as `text` (for auth provider compatibility)

---

## 7. Project Phases

Each phase produces a complete, usable increment. Features within a phase can be broken into smaller tasks.

### Phase 1 — Foundation

- Project scaffolding: React Native + Tamagui + Hono + Bun + PostgreSQL
- Authentication: email/password, Google sign-in, Apple sign-in
- Password reset and email verification
- User profile management
- Dark/light theme system
- Base navigation and app shell
- CI/CD pipeline setup

### Phase 2 — Core Financial Engine

- Account management (CRUD, all types)
- Multi-currency support (BRL, USD)
- Category and tag management (with pre-seeded defaults)
- Transaction engine (CRUD, transfers, splitting, search/filter)
- Quick-add FAB for transactions

### Phase 3 — Smart Data Entry

- Receipt scanning: camera capture, S3 upload, AI extraction, review form
- Recurring payment rules engine
- Recurring payment scheduler (auto-post and pending creation)
- Pending transaction review queue

### Phase 4 — Import & Sharing

- PDF bank statement import and parsing
- Transaction matching and missing entry detection
- Account sharing (invite link, permissions, revoke)

### Phase 5 — Insights & Engagement

- Dashboard with all widget sections
- Reports (income vs. expenses, spending by category, account summary)
- Budget system (create, track, rollover)
- Push notifications (recurring payments, budgets, processing complete)

### Phase 6 — Monetization

- Stripe integration
- Subscription tiers and feature gating
- In-app purchase flow (iOS + Android)
- Free tier limit enforcement

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Dashboard load time | < 1 second (up to 50k transactions) |
| Transaction search | < 300ms response |
| Receipt AI extraction | < 5 seconds end-to-end |
| Statement PDF parsing | < 15 seconds (up to 200 transactions) |
| Push notification delivery | < 60 seconds from trigger |
| App startup (cold) | < 2 seconds |
| API response (95th percentile) | < 500ms |
| Minimum iOS version | iOS 15+ |
| Minimum Android version | Android 10+ (API 29) |
| App binary size | < 50MB |

---

## 9. Out of Scope (v1)

Explicitly not included in v1 but may be considered for future versions:

- Web application (planned post-launch, API is ready)
- Offline transaction entry and sync
- Cross-currency transfers with exchange rate
- Automatic bank sync (Plaid, Open Banking)
- Stock/investment portfolio tracking (price sync)
- AI-powered auto-categorization (beyond simple keyword matching)
- Home screen widgets (iOS/Android)
- Receipt image permanent storage
- Shared account activity notifications
- Data export (CSV, PDF, backup)
- TOTP-based two-factor authentication
- Biometric login (Face ID, fingerprint)
- Goal tracking and financial planning
- Bill negotiation or subscription cancellation services
- Tax reporting
- Receipt OCR for handwritten receipts

---

## 10. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| AI receipt extraction accuracy below target | High | Medium | Allow manual fallback for every scan; track accuracy metrics to evaluate providers; start with the simplest reliable provider |
| Bank PDF format changes break parsing | Medium | High | Version parsers per bank; accept degraded accuracy for non-target banks; user can always enter manually |
| App Store rejection (Apple) | High | Low | Follow Apple guidelines strictly: support Sign in with Apple, account deletion, no external payment links for digital goods |
| Receipt/statement processing latency | Medium | Medium | Process async; show progress indicator; optimize image size before upload |
| Scope creep during implementation | High | High | Strict adherence to phased delivery; new ideas go to backlog, not current phase |
| Stripe + App Store billing complexity | Medium | Medium | Defer to final phase; use RevenueCat or similar abstraction to handle both platforms |
| Multi-currency rounding errors | Low | Medium | Store all amounts in cents; round only at display time; test with known edge cases |

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| Daily active usage | Used at least 5 days/week for 30 days after launch |
| Transaction entry time | < 10 seconds for manual entry, < 15 seconds for receipt scan |
| Receipt scan success rate | > 80% accurate extraction (amount + date + payee) |
| Statement import adoption | > 50% of users try it within first month |
| Recurring payment coverage | All user subscriptions tracked with zero missed bills |
| Subscription conversion | > 5% free-to-premium conversion (after Stripe launch) |

---

## 12. Future Vision (Post-v1)

Features to explore after v1 is stable and adopted:

- **Web application** — Full web client against the same API
- **Offline-first** — Local SQLite/WatermelonDB with sync
- **Goal tracking** — Savings goals, debt payoff targets, milestone celebrations
- **Auto-categorization** — ML-based category suggestions that learn from user behavior
- **Home screen widgets** — iOS WidgetKit + Android App Widgets for balance glance
- **Bank sync** — Plaid or Open Banking integration for automatic transaction import
- **Shared account notifications** — Real-time alerts when someone transacts on a shared account
- **Biometric auth** — Face ID, Touch ID, fingerprint unlock
- **Advanced reports** — Net worth trend, cash flow sankey, category trends over time, export to CSV/PDF
- **Multi-language** — Full i18n beyond pt-BR and en-US
- **Family/household plan** — Organization-based sharing with roles (owner, admin, member)
