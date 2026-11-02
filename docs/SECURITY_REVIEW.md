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
