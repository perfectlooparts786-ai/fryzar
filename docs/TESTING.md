# FRYZAR testing and verification

**Audit source ref:** `foundation/fresh-build` at `4a082b342cfe10c96e31255c5a80814c25d506fb`.  
**Latest CI evidence available at audit time:** [run 41468812588](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468812588), successful on the same code/docs baseline. No application source changes were made in this audit.

## Commands and results

| Command/check | Result | Evidence / limits |
|---|---|---|
| `npm install --ignore-scripts --no-audit --no-fund` | PASSED in GitHub Actions | Existing CI install command; package manifest versions are exact, but there is no lockfile, so transitive resolution is not reproducible. |
| `npm test` | PASSED in GitHub Actions | API TypeScript typecheck, API unit tests (82/82) and Worker routing tests (6/6). |
| `npm run test:integration:local` | PASSED in GitHub Actions | Wrangler local D1 integration: concurrent stock-limited checkout, one idempotency replay, mismatched-key conflict, rollback after forced late statement failure. This tests checkout only. |
| `npm run build:storefront` | PASSED in GitHub Actions | TypeScript + Vite production build. |
| `npm run build:admin` | PASSED in GitHub Actions | TypeScript + Vite production build. |
| Three Wrangler preview dry-runs | PASSED in prior successful CI run | API, customer Worker and admin Worker configuration/build. No deployment in these CI runs. |
| Lint | NOT CONFIGURED | No lint script/config found in package manifest. |
| `npm ci --ignore-scripts --no-audit --no-fund` | NOT RUN / NOT VERIFIED | No package-lock.json exists. It must not be claimed to work. |
| Preview SQL integrity inspection | PASSED read-only | Migrations 1–4 listed; `PRAGMA foreign_key_check` returned no rows. |
| Preview aggregate financial checks | NO MISMATCHES, NOT MEANINGFUL YET | Zero orders/payments exist; no production-like data. |
| Live preview API checkout / authenticated admin D1 integration | NOT RUN | No preview writes or owner bootstrap during audit. |

The CI run is evidence for the repository code at the referenced head; it is not browser E2E, load testing, penetration testing, or proof that current preview Worker versions are byte-identical to branch source.

## API mock test coverage

The Node API suite uses mocked D1. Current tests cover:

- Health success, missing schema and DB failure.
- Public categories, product filters/limit, delivery zones, public config parsing and CORS.
- Checkout idempotency requirement, closed store, transfer flag, server-calculated price, replay and conflicting payload.
- Tracking response PII minimization.
- Owner bootstrap Origin, single-use claim and secure session behavior.
- Login success/failure, generic credential failure, identity throttling, concurrency boundary and fail-closed DB errors.
- Admin order access by role, kitchen PII projection, invalid status and cancellation role/batch.
- Inventory adjustment permissions, limits, ledger writes, opening stock, replay, payload mismatch and conditional update.
- Delivery-zone read/write roles, validation, audit and duplicate-code conflict.
- Store setting allowlist and release gates.
- Staff role assignment, directory exposure, deactivation, session revocation and password reset.
- COD payment projection, role controls, delivered gate, idempotent replay and key mismatch.
- Aggregate dashboard metrics and role denial.

The mocks verify expected requests, SQL and D1 batch construction; they do not prove Cloudflare D1 executes every batch exactly as expected.

## Local D1 integration

`tests/checkout.integration.cjs` uses a temporary Wrangler local D1 persistence directory and fixture. It applies migrations locally, runs a real API Worker, sends three concurrent orders against five units of stock, checks exactly two succeed, verifies the stock and related rows, tests replay/payload conflict, then injects a late ledger failure and verifies rollback. Test secrets are synthetic and written only into a temporary local env file.

No equivalent real-D1 integration currently covers cancellation races, bootstrap races, authentication/session lifecycle, payment collection, or financial total constraints.

## Read-only preview D1 checks (2 November 2026)

Through the authorized Cloudflare API, SQL reads confirmed:

- The D1 migration ledger contains `0001_core.sql` through `0004_inventory_adjustments.sql`.
- `PRAGMA foreign_key_check` returned zero rows.
- Orders, products, users, bootstrap claims, payment proofs, support cases and notifications have zero rows.
- Order total vs subtotal/fee/discount, payment amount vs order total, and order subtotal vs item sum mismatch counts are zero across an empty order set.
- No `customers` table exists.
- D1 database-list metadata said `num_tables=0`, while `sqlite_master` returned the tables and indexes. This discrepancy remains unresolved; the SQL query verified schema presence.

All reads were SELECT/PRAGMA only. No preview writes/migrations or owner bootstrap were performed.

## Follow-up regression tests

1. Bound/validate order-list pagination, including unsafe and very large offsets.
2. Race two cancellations in local D1; ensure stock and movement restore once.
3. Race first-owner bootstrap; exactly one claim/user/session succeeds.
4. Verify order item sums, discounts, delivery fee, total and payment amount, including conflicting order/payment states.
5. Verify session expiry/revocation and role changes against Worker + local D1.
6. Establish retention tests for idempotency and rate-limit rows before implementing cleanup.


## Phase 2B changes and environment blocker

On 2 November 2026, pagination handling was changed to reject invalid limits/offsets, cap page size at 50, cap offset at 10,000, and add an ID tie-breaker to ordering. Three API regression tests were added for invalid/unsafe offsets, invalid limits, max page size, normal pagination and deterministic ordering.

The branch was cloned from GitHub at `91168cf69f758c353ff4b619044a94dde752e8fe`. `npm install --ignore-scripts --no-audit --no-fund` was attempted in the fresh clone, but stalled on package registry access and was interrupted; no dependencies were installed. `node --check tests/api.test.cjs` and `git diff --check` passed locally before publishing the change. Consequently, the new tests, regression suite, real local D1 suites, builds and Wrangler dry-runs are **not verified** for the new commit. No new cancellation/bootstrap/session/financial integration cases were added because Wrangler and dependencies were unavailable to run and debug them.

Retention design remains separate: no cleanup job or SQL deletion was added. Keep 24-hour idempotency replay records for their full validity; define a bounded cleanup mechanism and operational metric before implementing cleanup. Do not prune financial or audit history. Rate-limit bucket retention also needs an explicit bounded policy.
