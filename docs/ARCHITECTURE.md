# FRYZAR architecture and API inventory

**Source reviewed:** `foundation/fresh-build` at `4a082b342cfe10c96e31255c5a80814c25d506fb` (2 November 2026).  
**Scope:** source audit of the API and four migrations, plus read-only preview D1 schema/integrity checks. This is not a penetration test.

## Runtime architecture

The candidate uses one API-owned D1 model:

```text
Customer browser -> fryzar-app-preview -> service binding -> fryzar-api-preview -> fryzar-preview D1
Admin browser    -> fryzar-admin-preview -> service binding -> fryzar-api-preview -> fryzar-preview D1
```

The storefront/admin are React + TypeScript SPAs served by static-asset Workers. The API is TypeScript on Workers; only it is bound to D1. Preview API D1 binding is UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`. Both frontend service bindings target `fryzar-api-preview`. No R2 binding is present in the API environment.

Production is read-only and separate: `fryzar-api` binds `fryzar-core`; legacy `fryzar-app` and `fryzar-admin` bind `fryzar-production`. Their schemas are not interchangeable. No production resource was changed.

## Endpoint inventory

All API routes are dispatched in `apps/api/src/index.ts`. Unless stated otherwise, responses are JSON with `Cache-Control: no-store`; common errors include `origin_not_allowed` (403), `internal_error` (500 with request ID), and `not_found` (404). Browser write routes require an exact allowed Origin. The top-level Worker allows originless requests; credentialed CORS is emitted only for explicitly configured origins.

| Method and route | Authentication / authorization | Validation and database behavior | Errors and source-backed test coverage |
|---|---|---|---|
| GET `/api/v1/health` | None | Checks D1 connectivity and presence of `store_settings`. | 503 for missing schema/database failure; mock tests cover ready, missing table, and DB failure. |
| GET `/api/v1/categories` | None | Reads active categories ordered by sort/name. | Mock test covers active-category query. |
| GET `/api/v1/products?category=&limit=` | None | Optional category slug validation; limit defaults to 24 and clamps to 1–50; reads available products from active categories. | Invalid category 400; mock tests cover validation, limit, bound query. |
| GET `/api/v1/storefront-config` | None | Reads only settings marked public and parses JSON values. | Mock test covers public allowlist and parsing. |
| GET `/api/v1/delivery-zones` | None | Reads active delivery zones and fees. | Mock test covers public active-zone projection. |
| POST `/api/v1/orders` | Guest; IP rate limit in preview/production | Requires JSON, bounded body, valid customer/contact/address/zone/language/payment/cart, and Idempotency-Key. Server reads current product prices, stock, store flags and delivery fees; D1 batch writes idempotency record, order, payment, snapshots, status/audit and stock movement/update. | 400 validation/idempotency; 409 product/stock/idempotency conflict; 422 payment/minimum/total; 429 rate limit; 503 closed store/config; 500 generic failure. Mock tests cover server pricing, idempotency, closed store and disabled transfer. Local Wrangler/D1 integration covers concurrent stock reservation, replay, payload mismatch and rollback on late failure. |
| GET `/api/v1/orders/track/:64-hex-token` | Bearer token; IP rate limit | Hashes token and reads order plus item snapshots. Does not select customer phone/address. | 404 unknown token, 429 rate limit; mock test verifies PII omission. |
| POST `/api/v1/admin/bootstrap-owner` | No session; exact browser Origin and `OWNER_BOOTSTRAP_TOKEN` (>=32 bytes); single-use claim | Validates email/name/password; atomically inserts claim, owner, session and audit. Does not require the claim to be checked only by an owner session. | 400 validation, 403 bad Origin/token, 409 already claimed, 503 token unavailable, 201 success. Mock tests cover Origin, success and claimed state. |
| POST `/api/v1/admin/login` | No session; exact browser Origin; IP and per-identity failure limits | Validates email/password, reads staff, verifies PBKDF2, records successful/failed attempts, creates hashed session and audit. | 400 invalid request, 401 generic credentials, 429 rate limit, 503 fail-closed throttle storage; mock tests cover success, failure, rate limiting and fail-closed cases. |
| POST `/api/v1/admin/logout` | Exact browser Origin; valid session is revoked when present | Hashes cookie token, updates session and audit; clears cookie. | 403 Origin; 200 idempotent-style response. No dedicated logout test was found in the current API test file. |
| GET `/api/v1/admin/session` | Secure session cookie | Reads active, unexpired session and active staff user. | 401 unauthenticated; mock tests cover missing cookie and login session behavior. |
| GET `/api/v1/admin/metrics` | Session; owner/manager/operator/kitchen/finance | Aggregate counts and delivered revenue only. | 403 disallowed role; mock tests cover metrics and rider denial. |
| GET `/api/v1/admin/orders?status=&limit=&offset=` | Session; owner/manager/operator/kitchen | Status validation; limit clamps 1–50; offset is nonnegative integer but not capped or safe-integer checked. Kitchen projection nulls customer contact/address. | 400 invalid status; role 403. Mock tests cover finance denial, kitchen PII projection and invalid status. Very large offsets are a pagination hardening gap. |
| GET `/api/v1/admin/orders/:uuid` | Session; owner/manager/operator/kitchen | Reads order, snapshots and status history; kitchen contact fields are null. | 404 missing order; role 403. No dedicated detail-route test was found. |
| PATCH `/api/v1/admin/orders/:uuid/status` | Session and exact Origin; owner/manager/operator/kitchen, with role-specific transition checks | Allows only configured status graph; D1 batch conditionally updates order, writes status event/audit, and restores tracked stock once on owner/manager cancellation. | 400 invalid status/body, 403 role/transition, 404 missing, 409 raced/failed transition. Mock tests cover kitchen cancellation denial and manager cancellation batch; local D1 integration currently exercises checkout, not cancellation race. |
| GET `/api/v1/admin/inventory/movements?product_id=` | Session; owner/manager/operator/kitchen | Reads adjustment ledger with actor and product names; optional UUID filter. | 400 invalid product, 403 role. Mock tests cover role/read restrictions. Note this endpoint reads `inventory_adjustments`, not the raw `inventory_movements` table. |
| POST `/api/v1/admin/inventory/adjustments` | Session and Origin; owner/manager | Requires Idempotency-Key; validates product, integer delta, reason and note; conditional stock update and adjustment/movement/audit/idempotency writes in one batch. | 400 validation/key; 404 product; 409 insufficient/untracked/raced/replay conflict. Mock tests cover permissions, stock bounds, replay and concurrency predicate. |
| GET/POST `/api/v1/admin/categories`; PATCH `/api/v1/admin/categories/:uuid` | Session; reads owner/manager/operator/kitchen; writes owner/manager + Origin | Category slug/name/descriptions/order/active validation; writes audit in batch. No delete route; deactivate instead. | 400 validation, 404 update target, 409 unique conflict (database error handling may be generic on this route). No dedicated category write test was found. |
| GET/POST `/api/v1/admin/products`; PATCH `/api/v1/admin/products/:uuid` | Session; reads owner/manager/operator/kitchen; writes owner/manager + Origin | Validates product, price, image URL, stock and category; opening stock is ledgered; PATCH rejects stock changes outside adjustment API. | 400 validation/category, 404 update target, 409 slug/SKU conflict or inventory-ledger requirement. Mock tests cover ledger bypass and opening stock. No delete route. |
| GET/POST `/api/v1/admin/staff`; PATCH `/api/v1/admin/staff/:uuid`; POST `/api/v1/admin/staff/:uuid/reset-password` | Session; owner/manager. Managers cannot manage managers/owners or assign manager. | Password policy/hash; active/role changes revoke sessions; writes audited. | 400 validation, 403 assignment/role, 404 target, 409 conflicts/self-deactivation; tests cover role boundaries, session revocation and reset. |
| GET/PATCH `/api/v1/admin/settings` | Session; read owner/manager/operator/kitchen/finance/rider/support; writes owner/manager + Origin | GET returns public settings only. PATCH allowlists store names, language, COD flag, WhatsApp and setup/paused status; release-gated keys are rejected; audit included. | 400 invalid setting, 403 role/Origin, 409 release gate/write conflict. Mock tests cover write allowlist and gate. |
| GET/POST `/api/v1/admin/delivery-zones`; PATCH `/api/v1/admin/delivery-zones/:uuid` | Session; read owner/manager/operator/rider; writes owner/manager + Origin | Validates zone code/name/country/city/fee/minimum; update is soft deactivation; writes audit. | 400 validation, 403 role/Origin, 404 update target, 409 duplicate code. Mock tests cover read/write roles, update and duplicate. |
| GET `/api/v1/admin/payments?status=` | Session; owner/manager/finance | Lists COD payment/order fields without customer contact/address. Status filter is unpaid/collected. | 400 filter, 403 role; mock tests cover finance projection and operator denial. |
| POST `/api/v1/admin/payments/cod-collection` | Session and Origin; owner/manager/finance | Requires Idempotency-Key; only delivered unpaid COD; conditionally updates order/payment, records collector/audit/idempotency in batch. | 400 key/body, 404 missing payment, 409 state conflict/replay; mock tests cover role, gates, replay and payload mismatch. |

Unknown admin paths require authentication before returning 404. Unsupported methods are generally 405 for matched resource paths. No API delete route exists.

## Database model and live preview findings

Migrations are ordered `0001_core.sql` through `0004_inventory_adjustments.sql`; live D1 `d1_migrations` records all four in that order. Schema contains 21 application tables: 19 from 0001 plus `bootstrap_claims` (0003) and `inventory_adjustments` (0004). D1’s `d1_migrations`, `sqlite_sequence`, and `_cf_KV` are additional metadata/system tables.

- Catalog: categories -> products (nullable category, SET NULL); products -> product_images (cascade). No variant table; inventory belongs directly to products.
- Orders: orders optionally reference delivery zone (SET NULL); order_items reference orders (cascade) and products (SET NULL), with immutable product/price snapshots.
- Payments: one payment per order is enforced by the unique index in 0002; payment proofs reference payments (cascade). Guest name/phone/address are stored on orders; there is no `customers` table or customer account identity.
- Staff: staff_sessions reference staff_users (cascade); audit actors, payment reviewers, inventory actors and support assignees reference staff users (usually SET NULL).
- Operations: inventory adjustments reference products and staff; movement ledger references products. Bootstrap claims are separate single-use state. Idempotency and rate-limit records are keyed independently. Support cases and notifications have schema but no API endpoints.

Schema constraints include nonnegative prices/fees/stock, supported enum checks, unique product/category/zone identifiers, positive order-item quantity, one payment/order, and one-time movement indexes. Migration 0001 defines indexes for catalog, orders, payments/proofs, inventory, sessions, auth attempts, rate limits, audit, support and notifications; 0002 adds checkout integrity trigger/indexes; 0004 adds adjustment constraints/indexes.

Read-only preview SQL on 2 November 2026 confirmed: applied migrations 1–4; `PRAGMA foreign_key_check` returned no violations; orders, staff users, bootstrap claims, products, payment proofs, support cases and notifications currently have zero rows. Financial mismatch queries returned zero rows, but there are no orders, so they do not validate populated financial behavior. There is no customer table (querying it returned “no such table”). Cloudflare’s database-list metadata reported `num_tables: 0` while SQL schema introspection returned the schema tables; treat that metadata count as inconsistent, not as evidence of an empty schema.

## Business capability status

| Capability | Classification | Evidence / gap |
|---|---|---|
| Store config, categories, products, availability, product-level inventory | IMPLEMENTED AND VERIFIED (source/tests); preview currently has no products | Public read and admin CRUD/availability/inventory routes; no product variants or image upload. |
| Delivery zones and charges | IMPLEMENTED AND VERIFIED (source/tests); preview has no seeded zones | Server recalculates zone fee and minimum at checkout. |
| Guest checkout, COD, order tracking | IMPLEMENTED AND VERIFIED in local integration; not populated/live checkout | Server price authority, idempotency, batch and concurrency/rollback local D1 tests. Store remains setup/closed. |
| Manual transfer proof/review | PARTIALLY IMPLEMENTED | Flags/schema/payment states/proof metadata table exist; transfer disabled; no submission, private storage, retrieval, review, reject, refund or reconciliation endpoint. |
| Customer account/order history | NOT IMPLEMENTED | Guest data is on order; tracking token is the only customer lookup. |
| Support references | PARTIALLY IMPLEMENTED | `support_cases` table exists, no API/UI route. |
| Promotions/discount application | NOT IMPLEMENTED | Order has discount column but no promotion model or checkout logic; discount is currently zero. |
| Refund/cancellation financial records | PARTIALLY IMPLEMENTED | Order cancellation status and stock restoration exist; no refund/payment reversal record or endpoint. |
| Staff lifecycle and role controls | IMPLEMENTED AND VERIFIED in mocked API tests | Create/update/reset/deactivate and session revocation; no owner has yet been bootstrapped in preview. |
| Dashboard analytics and audit log | PARTIALLY IMPLEMENTED | Aggregate metrics and write-side audit events exist; no audit-log read endpoint; analytics are lifetime aggregates. |

Latest CI baseline is [run 41468812588](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468812588); details are in [testing](TESTING.md). See [project state](PROJECT_STATE.md) and [security review](SECURITY_REVIEW.md).


## Phase 2B pagination policy (implemented; CI pending)

Admin order listing preserves the existing limit/offset response shape. Limit must be a positive safe integer and is capped at 50 (the existing maximum). Offset must be a safe integer from 0 through 10,000; invalid, negative, unsafe, or larger values return HTTP 400 `invalid_order_pagination` before the order query. Ordering is now deterministic by `created_at DESC, id DESC`. The cap bounds deep offset work while retaining compatibility for ordinary existing pages. Cursor pagination can be considered if order volume later requires deeper browsing.


## Backend reliability update (2 November 2026)

The current tested source commit is `908f28eb691d395c1d1b7cd1d027a1280ce2f482`; CI run [41491718547](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41491718547) passed. This supersedes the earlier pagination section's “CI pending” note above.

The API remains the only Worker with a D1 binding. Its scheduled handler performs bounded operational retention cleanup using the existing D1: daily at `17 2 * * *`, at most 100 eligible rows per table per run, in one atomic batch. It removes only expired idempotency records, rate-limit windows beyond their maximum validity, and login-attempt records older than 30 days. It does not delete sessions or business/audit history. Migration 0005 adds indexes supporting the expiry scans. No new service, database, dependency, or paid feature was introduced.

This scheduled configuration and the related source are tested locally and in dry-run only. The existing preview deployment remains at its last verified candidate `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`; this change was not deployed. Production architecture/resources remain unchanged.


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
