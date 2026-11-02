# FRYZAR task backlog

## Backend audit findings

| ID | Task | Status | Evidence / exit criteria |
|---|---|---|---|
| P2-001 | Inventory current API endpoints, auth, roles, validation, D1 writes and tests | DONE | Full source-backed matrix in [ARCHITECTURE.md](ARCHITECTURE.md); API router is `apps/api/src/index.ts`. |
| P2-002 | Audit migrations and preview D1 schema/integrity | DONE | Live migration ledger 0001–0004; 21 application tables; FK check clean; database currently has no catalog/orders/users. |
| P2-003 | Checkout totals/idempotency/stock/integration review | DONE (bounded scope) | Source review and local D1 integration confirm price authority, atomic batch, stock concurrency, replay, key mismatch and rollback; no live checkout/write was performed. |
| P2-004 | Review staff authentication, role authorization, CSRF/origin, tracking PII | DONE (source and mock-test review) | Findings and limitations in [SECURITY_REVIEW.md](SECURITY_REVIEW.md); not a penetration test or live authenticated D1 test. |
| P2-005 | Add D1 integration coverage for status cancellation race and bootstrap race | OPEN | Use local isolated D1 fixtures; assert exactly-once stock restore and single bootstrap winner; do not use preview writes for test fixtures. |
| P2-006 | Add integration coverage for financial totals and payment/order state consistency | OPEN | Assert order line sums, discount/fee/total and payment amount under representative fixtures; choose DB constraints only after compatibility review. |
| P2-007 | Define bounded admin pagination | OPEN | Validate safe integer and a documented maximum or implement cursor pagination; add regression tests for huge/negative/invalid offsets. |
| P2-008 | Define lifecycle cleanup for idempotency and IP rate-limit rows | OPEN | Retention interval, bounded batch cleanup strategy and tests; avoid unbounded per-request table scans. |
| P2-009 | Manual transfer proof lifecycle | NOT IMPLEMENTED | Add private storage binding, upload validation, staff review, rejection/refund and reconciliation only as a future reviewed scope. Keep flag disabled. |
| P2-010 | Customer, support, variants, promotions and product image capabilities | NOT IMPLEMENTED / PARTIAL | Schemas exist for support/proofs/images/notifications but routes/storage are absent; customer/variant/promotion models do not exist. Establish product requirements before schema work. |
| P2-011 | Owner bootstrap rehearsal | NOT RUN | Preview D1 has no users/claim; controlled operator action required, never do it as an audit side effect. |
| P1B-001 | Lockfile and npm ci reproducibility | BLOCKED | No `package-lock.json`; prior package registry access was unavailable and automated review rejected the persistent-write auto-commit workflow. Use an approved maintainer-controlled lockfile path; do not bypass that rejection. |

## Verified baseline (2 November 2026)

[GitHub Actions run 41468812588](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468812588) passed on branch baseline `4a082b342cfe10c96e31255c5a80814c25d506fb`. It uses existing `npm install` workflow because there is no lockfile. See [TESTING.md](TESTING.md).

## Release boundaries

- Do not enable public ordering; preview store remains setup/not-ready.
- Do not enable manual transfer until private proof storage and financial review are complete.
- No production deployment, schema mutation, DNS/route change, credential change or production cutover is part of this audit.
- Keep PR #1 draft and PR #3 open archival.


## Phase 2B status

- Pagination is implemented in `apps/api/src/index.ts`: positive safe integer limit capped at 50; safe integer offset 0–10,000; deterministic `created_at DESC, id DESC`; invalid pagination returns 400 before D1. Regression tests were added, but CI execution is pending.
- Local npm registry access stalled, leaving dependencies unavailable. Cancellation concurrency, bootstrap race, session lifecycle, financial fixture, cleanup tests, builds and Wrangler dry-runs remain unverified for this change.
- No retention cleanup was implemented. Preserve 24-hour idempotency replay and financial/audit history; decide bounded operational cleanup and safe metrics before code changes.
- Next action: run GitHub CI on the pushed commit; then add and execute real local Wrangler D1 suites for cancellation race, bootstrap race, session lifecycle and financial rollback before closing remaining items.



## Phase 2B.1 status (2 November 2026)

Implementation/test source head: `cca13ba2865c5270b2ffb9772ae88311b9f0f8cd`. GitHub Actions [run 41482573350](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41482573350) passed the new local real-D1 cancellation suite and existing API, checkout integration, storefront/admin build, and three Wrangler preview dry-run checks.

- **P2-005 cancellation race portion: DONE.** Dedicated isolated Wrangler D1 test verifies concurrent cancellation, exactly-once stock/movement restoration, repeat and invalid-state rejection, status/audit consistency, and atomic rollback on an injected final-statement failure. Cancellation's status event column was corrected from `actor_staff_id` to schema-defined `actor_id`; same-transition status/audit inserts are guarded against duplicates. This does not complete the separate bootstrap race requirement.
- **P2-007 pagination: DONE.** Positive safe integer limit capped at 50; safe offset 0–10,000; invalid inputs return 400; ordering is `created_at DESC, id DESC`. Existing source and regression coverage were not rewritten in this task.
- **Still open:** real-D1 owner bootstrap race, session lifecycle and authorization, populated financial/payment integrity and rollback, and bounded retention policy/tests. Preserve the 24-hour idempotency replay window; no cleanup job was introduced.
- **Evidence scope:** CI used the existing `npm install --ignore-scripts --no-audit --no-fund` workflow. No claim is made that `npm ci` works; there is no committed lockfile. No remote preview test writes or deployment occurred.

The earlier backlog lines saying cancellation integration/builds/dry-runs were unverified are historical and superseded for the exact CI run above. Remaining Phase 2B tasks must stay open until separately tested.


## Phase 2B.2–2B.6 backlog update (2026-11-02)

- **DONE with real local D1 CI evidence:** owner bootstrap single-winner/rollback; staff session lifecycle/current-role authorization; populated financial assertions and COD collection guard; bounded scheduled cleanup and repeat/failure behavior; existing checkout and cancellation race suites remain green.
- **Financial invariant limitation:** populated line/subtotal/fee/discount/total/payment checks pass in fixtures, and COD collection rejects amount mismatch. The schema does not enforce all cross-row arithmetic; no migration was added for those invariants in this phase.
- **Remaining:** generate/commit a dependency lockfile through an approved, reproducible method; perform an owner-controlled preview bootstrap only if/when authorized; review payment-proof/refund lifecycle, frontend CSP/XSS and browser E2E before launch; verify new scheduled cleanup only after a reviewed preview deployment.
- **Security scope:** source review and local D1 integration only; no penetration test, remote preview write, deployment, or production change.
- Evidence: push CI [41491718547](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41491718547) and PR CI [41491727416](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41491727416), both successful on implementation head `908f28eb691d395c1d1b7cd1d027a1280ce2f482`.
