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


## Real local D1 cancellation concurrency (2 November 2026)

GitHub Actions run [41482573350](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41482573350) passed the new `npm run test:integration:cancellation` step against the real Worker and temporary Wrangler local D1. It uses a separate synthetic fixture and temporary persistence directory; it does not connect to remote D1.

Fixtures include a manager session; two tracked products; a pending COD order with two item lines; a second pending order for forced rollback; delivered and rejected orders; matching payment rows and reservation movements. Concurrent requests produced exactly one accepted cancellation and one safe rejection. Product A moved from 0 to 2 (two units restored, while other synthetic orders retain reservations); Product B moved from 2 to 3 (one unit restored). Exactly one cancellation movement per product, one cancelled status event, one status audit, two original items, and the original unpaid COD payment remained. Repeated, delivered, and rejected cancellation attempts were rejected without additional stock changes. A local trigger rejected the final audit insert; the API returned 409 and all order, stock, movement, status-event and audit values matched the pre-request state.

The first real-D1 run exposed that cancellation inserted `actor_staff_id` into `order_status_events`, while migration 0001 defines `actor_id`. The API now writes the schema-defined column. Additional anti-duplicate guards prevent same-transition status/audit history duplicates when concurrent requests observe equal millisecond timestamps. The race assertion verifies unique history regardless of timing; it does not assert that the requests necessarily shared one timestamp.

CI run 41482573350 also passed existing `npm test`, `npm run test:integration:local`, storefront/admin builds and all three Wrangler preview dry-runs. The workflow used `npm install --ignore-scripts --no-audit --no-fund`. Mocked tests remain separate from both local D1 suites. No preview or production writes/deployment were performed.


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
