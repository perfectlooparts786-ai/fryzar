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


## Phase 3 repository audit refresh — 3 November 2026

This section is the current source-backed status and supersedes older phase notes above where they conflict. Audited branch head: `01421f77d4e525c5eba4d4fe401b0da7786b5615`; PR #1 remains open, draft and unmerged. Latest full push and PR CI on that exact head passed: [push run 41567708917](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41567708917) and [PR run 41567713314](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41567713314). Each completed the npm ci install, typecheck/API tests, Worker routing, six isolated local D1 suites, both frontend builds and all three Wrangler preview dry-runs. No deploy step ran.

The committed root `package-lock.json` is lockfileVersion 3 and was generated by npm 10.9.9 from the exact root manifest without changing declared dependency versions. CI now uses `npm ci --ignore-scripts --no-audit --no-fund`; that command passed in both runs above. The direct workstation registry attempt was denied with EACCES, so lockfile generation was performed and verified by GitHub Actions. Lint remains unconfigured; browser E2E remains unimplemented.

### File-based implementation map and verified gaps

- `apps/api/src/index.ts`: Worker route dispatch, request validation, auth/session helpers, checkout/order/payment/stock operations, retention handler and scheduled entry point. It is the only application D1 binding.
- `apps/api/migrations/0001_core.sql`–`0005_retention_indexes.sql`: ordered core schema, checkout integrity, bootstrap claim, inventory adjustment ledger, and operational expiry indexes. Local CI applies these to isolated Wrangler D1; no remote migration ran in this audit.
- `apps/storefront/src/App.tsx`, `api.ts`, `types.ts`, `styles.css`: bilingual React storefront with catalogue, search/category filtering, cart, delivery selection, guest checkout, order confirmation and token-based tracking. Product options/variants and a dedicated product-detail interaction are absent; product cards directly add an item.
- `apps/admin/src/App.tsx`, `api.ts`, `styles.css`: authenticated role-aware operations UI for overview, orders, catalogue, inventory, payments, delivery, team and settings. API authorization is authoritative. Support, notification, audit-read, proof review and refund screens/routes are not implemented even where schema tables exist.
- `apps/customer-worker` and `apps/admin-worker`: static asset Workers forwarding `/api` through the preview service binding. `apps/api/wrangler.toml`, `apps/customer-worker/wrangler.toml`, `apps/admin-worker/wrangler.toml` identify the candidate preview names and bindings.
- `.github/workflows/ci.yml`: read-only repository permission, Node 22, lockfile-based install, unit/routing and six local D1 suites, builds and three preview dry-runs. There is no lint or browser E2E job.
- `.github/workflows/deploy-preview.yml`: separate manual preview deployment workflow; source pin remains `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. It was not invoked. The tested branch head is not the deployed version.
- `tests/*.test.cjs`, `tests/*.integration.cjs`, `tests/fixtures/*.sql`: mocked unit/routing coverage plus real local Wrangler D1 checkout, cancellation, bootstrap, session, financial and retention integrations. They do not exercise a real browser or live D1.

No source evidence in this audit supports R2 uploads, variants, manual-transfer proof lifecycle, refunds, customer accounts, support workflow or external notification delivery. Those are not claimed complete. No remote Cloudflare state was queried during this audit refresh; preview deployment details above refer to the previously verified deployment record, not a fresh live read.
