# FRYZAR project state

**Verified:** 2 November 2026  
**Repository:** `perfectlooparts786-ai/fryzar`  
**Default branch:** `main` at `bac292b3e99d505f69be01e62c2b3f7621708a5f`  
**Development branch:** `foundation/fresh-build` at audit baseline `4a082b342cfe10c96e31255c5a80814c25d506fb`; main integrated with a normal two-parent merge.  
**PR #1:** open, draft, unmerged.  
**PR #3:** open, draft archival Worker source snapshot; not candidate source.

## Preview and production

Preview Workers are `fryzar-api-preview`, `fryzar-app-preview`, and `fryzar-admin-preview`. The API binds D1 `fryzar-preview` UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`; frontends bind to the API Worker service. Verified deployment run [41383813602](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41383813602) remains pinned to candidate `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. No deployment was initiated during this backend audit.

Live preview D1 read-only inspection confirmed migration records 0001–0004, no foreign-key violations, and currently zero products, orders, staff users, bootstrap claims, proof records, support cases or notifications. All four migrations match the branch source. SQL financial consistency queries produced zero mismatches across zero orders; they provide no evidence on populated-order behavior. A `customers` table does not exist; customer details are guest fields on orders. Cloudflare D1 list metadata reported `num_tables=0`, inconsistent with SQL metadata inspection.

Production was inspected read-only in the prior verified infrastructure audit: `fryzar-api` -> `fryzar-core`; legacy `fryzar-app` and `fryzar-admin` -> `fryzar-production`. These are separate schemas and remain untouched.

## Backend audit status

The endpoint inventory, D1 relationships, checkout/payment/order flows, authorization, test coverage and capability gaps are recorded in [architecture](ARCHITECTURE.md) and [security review](SECURITY_REVIEW.md).

Verified implementation highlights: server-calculated checkout totals; idempotent atomic D1 checkout; conditional stock reservation and cancellation restoration; hashed HMAC tracking token; PBKDF2 staff passwords; opaque hashed sessions; role gates; IP and identity login rate limits; COD collection with idempotency/audit; request body limits; exact-origin browser writes; no-store/security headers.

Preview is setup/closed and manual transfer is disabled. Although a preview bootstrap secret was previously verified by the deployment workflow without revealing its value, no bootstrap was run; live D1 currently has zero staff users and zero bootstrap claims. A first owner can be created only after the intended operator deliberately invokes the one-time endpoint with the preview secret. This audit did not do so.

## Baseline checks

GitHub Actions [run 41468812588](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468812588) passed on the audit baseline. The repository CI uses `npm install --ignore-scripts --no-audit --no-fund`, then API type checking, API tests, worker routing tests, local D1 integration and both frontend builds. Earlier same-code run [41468365672](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468365672) recorded the test/build steps and all three Wrangler preview dry-runs as passed.

There is no `package-lock.json`; `npm ci` remains unverified and dependency resolution remains unlocked. Lint is not configured. Full command details and verification boundaries are in [testing](TESTING.md).

## Outstanding risks and next work

- No preview application data: catalogue and delivery zones must be configured before any launch review.
- Manual-transfer proof submission/storage/review and refund/reconciliation are absent; keep transfer disabled.
- Customer accounts, variants, promotions, support API, customer notifications, product-image upload, and audit-read APIs are not implemented.
- Product images reference object keys, but no R2 binding/upload path exists.
- Order list offset is unbounded/not safe-integer checked; deep pagination may cause avoidable query work or database errors.
- Idempotency/rate-limit tables have no general expiry cleanup; expired keys are only deleted when the same key is reused, and rate-limit buckets are retained.
- Status cancellation race and bootstrap race do not yet have real D1 integration tests. Existing mock tests do not prove Cloudflare D1 atomicity; local integration covers checkout only.
- Financial consistency SQL constraints do not enforce line-sum/order-total/payment-total equality at the database layer; current live zero-order data cannot validate this.
- Lockfile/reproducible `npm ci` remains Phase 1B blocker.

**Next phase:** resolve the lockfile blocker through an approved maintainer-controlled method, then prioritize authenticated D1 integration tests and bounded admin pagination. No production cutover or public ordering is authorized by this audit.



## Current cancellation test state (2 November 2026)

The branch contained the cancellation implementation at `cca13ba2865c5270b2ffb9772ae88311b9f0f8cd`; PR #1 remains open and draft. GitHub Actions [run 41482573350](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41482573350) passed the dedicated cancellation integration test against a temporary local Wrangler D1, existing `npm test`, checkout local-D1 integration, both frontend builds, and API/customer/admin Wrangler preview dry-runs.

The cancellation endpoint now uses the schema's `order_status_events.actor_id` column. Concurrent same-order cancellation was verified to accept one transition, reject the competing/repeated requests safely, restore stock and add one movement per product exactly once, and write one cancelled status event and one audit row. A synthetic late audit insert failure verified atomic rollback across order, inventory, movement, status and audit rows. Existing COD payment and order items remained unchanged. The fixture is synthetic and local; no remote preview data was used.

Pagination is implemented and its regression policy remains: limit must be a positive safe integer and is capped at 50; offset must be a safe integer from 0 through 10,000; invalid values return HTTP 400; ordering is stable by `created_at DESC, id DESC`.

The earlier statements above describing pagination as unbounded and cancellation as lacking real-D1 evidence are historical and superseded here. This evidence does **not** cover real-D1 bootstrap races, session lifecycle/authorization, financial consistency with populated fixture data, or retention cleanup; those remain outstanding. CI used the repository's `npm install --ignore-scripts --no-audit --no-fund`, not `npm ci` (no lockfile). No deployment, preview writes/bootstrap, or production changes occurred.


## Phase 2B.2–2B.6 verification (2026-11-02)

Implementation source was tested at commit `908f28eb691d395c1d1b7cd1d027a1280ce2f482`. GitHub Actions [run 41491718547](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41491718547) completed successfully on the push event; PR validation [run 41491727416](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41491727416) also completed successfully. This supersedes the pending/unverified Phase 2B notes above. Both runs use the same source head. Local integration suites used isolated Wrangler D1 and synthetic data only.

- API TypeScript check, 86 API unit tests, and 6 Worker routing tests passed.
- Local D1 checkout, cancellation, owner-bootstrap concurrency, session lifecycle, populated financial integrity, and bounded-retention integrations passed.
- Storefront/admin production builds and API/customer/admin Wrangler preview dry-runs passed. Dry-runs do not deploy.
- Owner bootstrap race yielded one 201 and one 409, exactly one owner/claim/session/audit, and verified PBKDF2 hash plus hashed session token. Invalid token/Origin/payload, repeated claim, safe response projection, and forced late-audit rollback passed.
- Session scenarios passed for valid and invalid login, generic credential failure, secure cookie attributes, hashed sessions, expiry, logout/revocation, staff deactivation, role change, password reset, route/role boundaries, kitchen PII projection, finance payment access, malformed cookies, and database failure fail-closed behavior. Authorization reads the current staff state/role; deactivation, reset and role change revoke sessions.
- Populated financial fixture verified order 1: item lines 2 × 12,500 + 3 × 4,500 = subtotal 38,500 paisa; delivery 3,000; discount 2,500; payable/payment amount 39,000. Order 2: subtotal 12,500 + delivery 1,000 − discount 500 = 13,000. A deliberately mismatched COD payment (19,999 vs total 20,000) was rejected. COD collection, replay, duplicate/new-key denial, cancellation payment preservation and late-audit rollback passed. Cross-row order/item/payment arithmetic remains application-level; no incompatible constraint migration was added.
- Retention cleanup runs once daily at `17 2 * * *`; each run removes at most 100 expired idempotency rows, rate-limit buckets and login attempts per table in one D1 batch. The 24-hour idempotency expiry is preserved, rate buckets expire only after the 15-minute maximum window, login attempts retain 30 days, and active sessions plus orders, items, payments, inventory movements and audits are excluded. Repeat and injected-failure tests passed. Migration 0005 adds expiry/retention indexes.
- The local test harness pins its local-only compatibility date to 2026-10-30 because the checked-in Wrangler 4.156.0 workerd runtime did not support the repository's 2026-11-01 date at test time. Deployed Worker configuration remains unchanged.

The existing preview deployment workflow remains manual and pinned to the reviewed deployment candidate `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. This phase did not invoke it or deploy the newly tested code. The previous read-only preview owner-state report said no owner/claim existed; it was not re-read in this phase. No remote preview writes/bootstrap or production changes occurred.

No `package-lock.json` is committed and `npm ci` was not run. CI used `npm install --ignore-scripts --no-audit --no-fund`; no dependency versions were changed. Lint remains unconfigured. These test runs are not a penetration test, browser E2E, production rehearsal, or deployment verification.

Current source verification commit: `908f28eb691d395c1d1b7cd1d027a1280ce2f482`. PR #1 remains open and draft. The verified deployed preview candidate remains the historical deployment commit above; this reliability change is tested but undeployed.


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
