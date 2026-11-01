# FRYZAR security review

This is a source review and test plan, not a penetration test or production sign-off. The controls below describe the candidate GitHub source on `foundation/fresh-build`. They must not be attributed to the currently deployed Worker until deployment and live verification are recorded.

## Implemented in candidate source

- Server-authoritative product prices, delivery-zone fees, minimum-order checks and store feature flags.
- Mandatory idempotency key with canonical request hash and 24-hour replay record.
- D1 batch for order, payment, item snapshots, stock reservation, idempotency, status event and audit writes.
- Non-negative tracked-stock constraints, product-availability trigger, unique payment/order index and unique order-inventory movement index.
- HMAC-derived private tracking token; SHA-256 token hash stored in D1.
- Tracking responses omit customer phone and delivery address.
- IP-hash D1 rate limits: checkout 5 per IP per 10 minutes, tracking 40 per IP per minute, admin login 5 per IP per 15 minutes.
- Salted PBKDF2-SHA256 password hashing; no hardcoded default owner password.
- One-time owner-bootstrap claim is inserted atomically with first owner and first session. The token is read from `OWNER_BOOTSTRAP_TOKEN`; no default token exists.
- Opaque session token is stored only as a hash; cookie is HttpOnly, Secure, SameSite=Strict, Path=/ with an 8-hour lifetime.
- Logout revokes the session. Staff role/deactivation/password updates revoke affected sessions.
- Bootstrap/login/logout and sensitive admin writes require an exact allowed browser Origin.
- Role-aware order list/detail endpoints; kitchen responses omit customer contact/address.
- Staff lifecycle endpoints with role-assignment checks, password reset, session revocation and audit records.
- Owner/manager cancellation source conditionally restores tracked stock and writes a unique inventory movement, status history and audit record.
- Owner/manager/finance COD collection updates order/payment state with idempotency and audit.

## CI evidence

The latest observed head of `foundation/fresh-build` was `5527ed812e9c6fb6dea85182aad768b50c686fe4`. GitHub Actions run [41278429752](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41278429752) completed successfully on that observed head; API TypeScript validation, API test, customer build and admin build steps succeeded. Run [41278344214](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41278344214) recorded 72/72 mocked API tests plus strict TypeScript validation and both web builds.

These are source/CI results using mocked D1 behavior. They do not prove live D1 atomicity, rollback, concurrent checkout/cancellation, deployed Worker behavior, real cookie/origin behavior, or browser E2E.

## Critical deployment and integration limitations

- The candidate API/admin/customer source has not been deployed to the live Workers. Exact legacy deployed Worker source is preserved separately in recovery PR #3 and differs materially from this candidate.
- The currently deployed API Worker still has `APP_ENV=development` and localhost-only origins. Production must use an approved, reviewed environment configuration.
- `OWNER_BOOTSTRAP_TOKEN` is not configured on the current live API Worker. Owner bootstrap must remain unavailable until the intended preview Worker receives a securely stored token.
- Development mode deliberately fails open for rate-limit DB errors/missing client IP. Production must set `APP_ENV=production` and prove fail-closed behavior.
- No CSRF token mechanism exists yet. SameSite=Strict plus exact Origin checking is in place for sensitive admin POST/PATCH endpoints. Reassess against final customer/admin origin topology.
- Manual-transfer proof storage, private retrieval, reviewer controls, rejection/refund and reconciliation are not implemented. Manual transfer must stay disabled.
- The live production customer Worker still has wildcard CORS and a legacy direct-D1 checkout path. The deployed admin Worker has legacy read-scope/login-throttle/cancellation-restock gaps, documented in audit PR #2.
- No final domain routes, TLS, Android client, or production payment provider has been verified.

## Required next security work

1. Run isolated D1 tests for bootstrap race, password hashing, login rate limits, session expiry/revocation, checkout idempotency, concurrent stock reservation and cancellation replay.
2. Add D1-native restore/rollback evidence before any migration or cutover.
3. Verify each protected endpoint's role access, PII projection, staff lifecycle, payment scope, delivery and audit behavior against a real isolated Worker/D1 environment.
4. Add/review CSRF strategy for final origin and deployment topology.
5. Review CSP, accessibility, and XSS defenses when web clients are served from their intended origins.
6. Verify production origins exactly; never use wildcard CORS with authenticated admin sessions.
7. Keep credentials, customer personal data and payment-proof contents out of Git and logs.
8. Keep manual transfer, store opening and public launch disabled until the above gates pass.