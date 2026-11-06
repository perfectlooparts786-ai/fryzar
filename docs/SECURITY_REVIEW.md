# FRYZAR security review

**Reviewed source:** `foundation/fresh-build` at `4a082b342cfe10c96e31255c5a80814c25d506fb` (2 November 2026).  
**Live checks:** read-only preview D1 schema, migration, row-count, foreign-key and aggregate consistency inspection.  
This review is not a penetration test, production sign-off or proof that every source behavior has been exercised against live D1.

## Controls verified in source

- Checkout uses server-side product price, availability, tracked stock, zone fee, minimum and store/payment settings; client prices are ignored.
- A required Idempotency-Key is scoped and request-hashed; stored replay response lasts 24 hours.
- Checkout writes order/payment/items/status/audit/idempotency and inventory changes in a D1 batch. Stock updates are conditional; migration 0002 adds product availability/stock trigger and one-payment/order and movement uniqueness indexes.
- HMAC-derived tracking token is returned once and only its SHA-256 hash is stored. Tracking selects no customer phone/address.
- Preview/production request throttles are stored by hashed client IP; checkout 5/10m, tracking 40/min, login 5/15m. Missing CF client IP and D1 failure fail closed outside development/test.
- Login adds a per-identity rolling failure cap, performs dummy PBKDF2 on unknown/inactive users, and fails closed if throttle reads/writes fail.
- Staff passwords use salted PBKDF2-SHA256 at 310,000 iterations; sessions use 32 random bytes, hashed at rest, eight-hour expiry, revocation, and `__Host-` Secure/HttpOnly/SameSite=Strict/Path=/ cookie.
- Bootstrap uses a configured token of at least 32 bytes, constant-time hash comparison, exact Origin, atomic claim/user/session/audit batch, and no default credential.
- State-changing browser admin routes require exact configured Origin; credentialed CORS is allowlisted. Response headers include nosniff, frame denial, referrer and permissions policies; JSON is no-store.
- Admin authorization is route-specific. Kitchen order projection nulls customer contact/address. Finance payment projection excludes customer contact data.
- Order cancellation is conditional and batched with stock restoration, unique movement, event and audit; only owner/manager can cancel/reject.
- COD collection requires delivered unpaid COD, idempotency, role authorization, and batched order/payment/audit changes.

## Findings and limitations

1. **Payment proof and refund lifecycle missing.** `payment_proofs` and payment status values exist in D1, but API has no proof submission/upload/private retrieval/review/reject/refund endpoint and API Env has no R2 binding. Manual transfer is disabled by default and must remain disabled.
2. **Missing business APIs despite schema.** `support_cases` and `notifications` have no API routes. No audit-read endpoint exists. `product_images` has no upload/management endpoint or object-storage binding.
3. **Guest-only customers.** No `customers` table, customer authentication, or order-history endpoint exists. Tracking token is the only customer order lookup.
4. **Unbounded admin pagination.** Orders offset accepts arbitrary nonnegative integer and is passed to D1 without a safe-integer or maximum check. Add a bounded/validated cursor or offset policy before data volume grows; no policy choice was made in this audit.
5. **Unbounded operational records.** Expired idempotency records are removed only when the exact key is reused; IP rate-limit buckets are not generally pruned. Login-attempt history is cleaned on login. This creates retention/storage growth and should have an explicit preview-safe cleanup design.
6. **Financial invariants mostly application-enforced.** Schema checks nonnegative fields but does not enforce order subtotal equals item-line sum, total equals subtotal + fee - discount, or payment amount equals total. Checkout calculates these consistently in source; live preview contains no orders, so the read-only mismatch check is vacuous.
7. **Concurrency evidence scope.** Mock tests cover cancellation batch composition, bootstrap claim behavior and conditional inventory writes. Real local D1 integration covers checkout concurrency/replay/rollback only; no live preview write tests were run and no bootstrap/cancellation/payment writes were attempted.
8. **Originless API calls.** Top-level CORS allows requests with no Origin; this is appropriate for public/server clients. Sensitive admin writes separately require a browser Origin and authentication. Reassess if non-browser admin clients are introduced.
9. **No CSRF token.** Admin uses SameSite=Strict cookie and exact Origin check on writes rather than a CSRF token. This is a deliberate current control combination, not proof against every deployment topology; reassess when custom domains/cross-site flows are introduced.
10. **No CSP in API headers.** API adds core response headers; storefront/admin CSP and browser XSS review remain separate frontend work.

## Preview owner bootstrap

The source path can create a first owner if preview `OWNER_BOOTSTRAP_TOKEN` is configured. The deployment workflow previously verified presence without exposing values. Read-only preview D1 currently has zero staff users and zero bootstrap claims, so it is unclaimed. This audit did not invoke bootstrap and did not create an account. Keep the token out of logs/commands and perform bootstrap only as a separately controlled preview operation.

## Live preview D1 evidence

Cloudflare SQL introspection found the 21 application tables and the four recorded migrations. `PRAGMA foreign_key_check` returned zero rows. Read-only counts showed zero orders, users, bootstrap claims, products, proofs, support cases and notifications. Aggregate mismatch queries returned zero, but no orders exist. The D1 list metadata field `num_tables` reported zero despite SQL metadata showing tables; this discrepancy is documented and should be resolved before relying on that metadata field.

No secret values were read. No database mutation, owner bootstrap, or deployment occurred.

## CI evidence and required follow-up

The audit baseline CI run [41468812588](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468812588) passed; testing details and limits are in [TESTING.md](TESTING.md).

Prioritize: (1) controlled first-owner bootstrap rehearsal in preview; (2) local D1 integration for cancellation races, bootstrap race, session revocation/expiry and financial row consistency; (3) pagination and retention policy; (4) private payment-proof storage/review and refund design before enabling manual transfer; (5) CSP/XSS and browser-origin review. Keep ordering closed and production untouched.



## Phase 2B.1: local D1 cancellation verification (2 November 2026)

Source head used for the passing implementation run: `cca13ba2865c5270b2ffb9772ae88311b9f0f8cd`. GitHub Actions [run 41482573350](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41482573350) passed the real local Wrangler D1 cancellation suite alongside API tests, checkout integration, both frontend builds and all three preview dry-runs.

The cancellation endpoint now inserts the migration-defined `order_status_events.actor_id` field. The real D1 test exposed the prior `actor_staff_id` mismatch. Same-transition event and audit writes also have `NOT EXISTS` guards, so timestamp equality is not used as proof that the conditional order transition occurred. The integration test concurrently sends two cancellations, verifies one accepted transition and one safe rejection, stock/movement restoration exactly once, one status event and one audit event, and unchanged order items/COD payment. A forced final audit insert failure returns a conflict and leaves order, stock, movement, event and audit state unchanged.

This is local-only test evidence. No remote preview bootstrap, test order, deployment or production change was performed. The earlier statement that no real-D1 cancellation test exists is superseded. Bootstrap races, session lifecycle, populated financial consistency, and retention cleanup remain unverified and separate. Pagination is implemented and regression-tested with limit 1–50, offset 0–10,000, 400 for invalid values, and stable `created_at DESC, id DESC` sorting.


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


## Updated security follow-ups

- Unbounded login-path pruning was removed; operational deletes now run through the bounded scheduled batch. Scheduling is configured in preview source but has not been deployed in this phase.
- COD collection now checks that payment amount equals the order payable total. The local populated fixture proves mismatch rejection. Other cross-row order arithmetic is still application/test enforced.
- Owner bootstrap/session behavior was exercised only against temporary local D1; preview's previously reported unclaimed state is historical and was not rechecked here.
- Do not treat CI as penetration testing, production approval, or proof that new code is deployed.
