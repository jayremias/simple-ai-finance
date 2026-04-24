# MoneyLens — Launch Plan

> Created: 2026-04-24

---

## What's Done

Core app works end-to-end: auth, accounts, categories, tags, transactions, receipt scanning, bank statement import API, recurring payments API. Solid foundation.

---

## BLOCKERS — Can't ship without these

| # | Item | Ticket | Notes |
|---|------|--------|-------|
| 1 | App icon + splash screen | CAB-32 | App Store/Play Store rejects without it |
| 2 | EAS Build pipeline | CAB-33 | No way to build/distribute to stores |
| 3 | Stripe integration | CAB-27 | Zero revenue without it |
| 4 | Free tier limits enforced | CAB-59 | Without it, users get unlimited free access forever |
| 5 | Decimal display on amounts | CAB-56 | Showing `$1000` instead of `$10.00` breaks trust immediately |

---

## HIGH PRIORITY — Merge In-Review PRs First

Already built, blocking mobile completeness. Merge now.

| Ticket | Item |
|--------|------|
| CAB-10 | Transaction list screen with filters |
| CAB-11 | Tag autocomplete in form |
| CAB-13 | Recurring payments mobile |
| CAB-49 | Transaction ordering fix |
| CAB-50 | Payee autocomplete |

---

## SHOULD HAVE — Launch feels incomplete without

| # | Item | Ticket |
|---|------|--------|
| 6 | Date pickers (not text inputs) | CAB-51 |
| 7 | Settings screen (manage subscription, sign out) | CAB-29 |
| 8 | Error boundaries | CAB-31 |
| 9 | Bank statement import mobile UI | CAB-17 |
| 10 | Reports API | CAB-20 |
| 11 | Analytics screen (basic charts) | CAB-21 |
| 12 | Categories alphabetical sort | CAB-54 |

---

## DEFER — Post-launch v2

- Account sharing (CAB-18, CAB-19, CAB-60)
- Push notifications (CAB-25, CAB-26)
- Budgets (CAB-22, CAB-23)
- Dashboard enhancements (CAB-24)
- Gemma 4 AI (CAB-58) — current OpenRouter works fine
- In-app purchase iOS/Android flow (CAB-28) — Stripe web checkout is sufficient initially
- Light theme, Sentry, CI/CD, ky migration

---

## Missing from Tickets — No ticket exists yet

| Gap | Why critical |
|-----|-------------|
| Production server deployment (Railway/Fly/ECS) | App can't point to prod API without it |
| Production env vars (.env.production, real S3 bucket) | Dev uses MinIO locally — breaks in prod |
| App Store / Play Store listing | Review takes 1–7 days — needs screenshots, description, privacy policy |
| Privacy policy + terms of service page | App Store hard requirement |
| Real AWS S3 bucket for prod | Receipt scans break without it |
| TestFlight internal testing | Validate build before public release |

---

## Sprint Order

1. Merge all In-Review PRs
2. Fix CAB-56 (decimal display) — small, high-visibility
3. CAB-32 (icon/splash) + CAB-33 (EAS Build) in parallel
4. Deploy API to prod + wire real S3
5. CAB-27 (Stripe) + CAB-59 (tier limits)
6. CAB-51, CAB-29, CAB-31 (UX polish)
7. TestFlight → App Store submission

**Realistic timeline to shippable build: 2–3 weeks** if Stripe + EAS are prioritized now.
