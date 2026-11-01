# FRYZAR security review

This is an initial design review, not a completed penetration test.

## Authentication and sessions
- No hardcoded owner password.
- One-time owner bootstrap uses a secret outside source control and becomes unusable after successful setup.
- Store only password hashes and session-token hashes.
- Secure, HttpOnly, appropriately scoped web session cookies.
- Enforce expiry, rotation, logout revocation, active-user checks, and password-change invalidation.
- API authorization must not depend on frontend route guards.

## Authorization
- Enforce least-privilege roles on every sensitive endpoint.
- Test missing, malformed, expired, revoked, and insufficient-role sessions.
- Restrict customer data, payments, proofs, support, and audit records by role.

## Data and business logic
- Validate all user-controlled lengths, formats, enums, and numeric bounds.
- Use parameterized SQL.
- Recalculate price, delivery, discounts, and totals on the server.
- Require idempotency and payload-hash matching.
- Make order and inventory writes atomic.
- Restore cancelled order reservations exactly once.

## Payments and uploads
- A submitted proof does not equal verified payment.
- Keep proof objects private.
- Validate detected MIME type, file contents, size, and extension.
- Generate storage keys; never use user filenames as paths.
- Restrict proof access to the relevant customer and authorized reviewer.
- Audit amount, reference, reviewer, decision, timestamp, and rejection note.
- Never place bank credentials or gateway secrets in browser code or GitHub.

## Browser and API
- Exact CORS allowlist; no wildcard for authenticated endpoints.
- Validate Origin and implement CSRF controls for cookie-authenticated state changes.
- Use CSP and security headers for web apps.
- Do not log phone, address, proof contents, hashes, tokens, or secret values.
- Apply abuse controls to login, checkout, tracking, and uploads.

## Open items
- Review completed session/auth code.
- Verify the role matrix.
- Test CSRF and cookie behavior on final hostnames.
- Test private upload/read controls.
- Review D1 queries and logs for data exposure.
- Run dependency and automated security checks before release.
