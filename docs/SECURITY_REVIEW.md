# FRYZAR security review

This is an initial implementation review, not a completed penetration test.

## Implemented controls
- Checkout requires an Idempotency-Key and binds it to a SHA-256 hash of the normalized payload.
- Order prices and delivery fees are read from D1. Client-provided prices/totals are not used.
- Order/payment/line-item/stock/audit writes use a D1 batch.
- A database trigger validates the current product state and tracked stock before line-item insert. A second trigger blocks negative stock.
- A unique index limits each order to one payment row.
- Order tracking token is HMAC-derived using the Worker secret; only its SHA-256 hash is stored in orders.
- Idempotency response cache stores order details without the raw tracking token. The token is re-derived for a same-payload replay.
- Customer order tracking omits phone and delivery address.
- Checkout/tracking use D1-backed rate limits keyed by a hash of the client IP.
- Worker response adds content-type, referrer, frame, and permissions security headers.
- Exact browser-origin allowlist is used. Current origins are development localhost origins only.

## Important current limitations
- Worker APP_ENV is development. The rate limiter is intentionally fail-open for missing client IP or rate-limit DB errors outside production. Production must set APP_ENV=production and verify that checkout/tracking fail closed.
- No staff login, owner bootstrap, session handling, CSRF controls, or role authorization has been implemented yet.
- No order cancellation/restocking endpoint exists.
- No private payment-proof storage or review flow exists. Manual transfer remains disabled.
- The current public storefront is not deployed.
- Live HTTP behavior and concurrency have not been independently verified.

## Required security work
### Staff identity and sessions
- No default owner password.
- One-time owner bootstrap uses a secret outside source control and becomes unusable after setup.
- Store password hashes and session-token hashes only.
- Secure, HttpOnly, appropriately scoped admin cookies.
- Expiry, rotation, logout revocation, active-user checks, and password-change invalidation.

### Authorization and data privacy
- Enforce least-privilege role permissions in every sensitive API handler.
- Restrict customer personal data, payment details, proof images, support cases, and audit history.
- Test all roles against missing/invalid/expired/revoked sessions.

### Checkout and inventory
- Test idempotency race and payload mismatch.
- Test D1 batch rollback, concurrent stock reservation, and stock restoration.
- Add authorized order-state transitions.
- Prevent duplicate cancellations and repeated inventory restoration.

### Payments and uploads
- Keep proof objects private.
- Validate detected MIME type, file content, size, and extension.
- Use generated object keys.
- Proof upload must not set payment verified.
- Verify amount/reference with an authorized reviewer and audit each decision.
- Never expose bank or gateway credentials in browser code or GitHub.

### Browser and API
- Configure production origins exactly.
- Add CSRF protections for cookie-authenticated state changes.
- Review CSP when the web clients are built.
- Do not log PII, tokens, secret values, or proof contents.
- Rate limits must be fail-closed in production.
