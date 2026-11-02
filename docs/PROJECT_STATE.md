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
