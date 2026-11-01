# FRYZAR security review

This is a source review and test plan, not a penetration test or production sign-off.

## Implemented in source
- Server-authoritative price and delivery fee calculation.
- Mandatory idempotency key with canonical request hash and 24-hour replay record.
- D1 batch for order/payment/line/stock/status/audit writes.
- Database triggers for tracked stock and product availability; unique indexes for one payment/order and order inventory movements.
- HMAC-derived private order tracking token; SHA-256 token hash stored in DB.
- Tracking responses omit phone and delivery address.
- IP-hash D1 rate limits for checkout and tracking; admin login rate limit.
- Password hashing with salted PBKDF2-SHA256; no hardcoded default owner password.
- One-time owner-bootstrap claim is inserted atomically with first owner and first session.
- Opaque session token is stored only as a hash; cookie is HttpOnly, Secure, SameSite=Strict, Path=/ and 8-hour max age.
- Logout revokes the session.
- Bootstrap/login/logout require an exact allowed browser Origin.
- Role-specific order access and kitchen data minimization.
- Cancellation source conditionally restores stock and writes a unique inventory movement, status history and audit record.

## Important limitations
- The latest source changes have not completed a verified combined CI run yet.
- New auth/admin/order API code has not been deployed to the Worker.
- \`OWNER_BOOTSTRAP_TOKEN\` is not yet configured.
- Development mode deliberately fails open for rate limit DB errors/missing IP. Production must set APP_ENV=production and verify fail-closed behavior.
- No CSRF token mechanism exists yet. Cookie SameSite=Strict plus exact Origin checking is in place for sensitive admin POST/PATCH endpoints. Reassess after domain/origin design.
- No password-reset/change, staff management, role assignment or account deactivation endpoints yet.
- No live D1 concurrency/rollback test of checkout or cancellation.
- Manual-transfer proof storage, private access, reviewer controls and COD collection are not implemented.
- API CORS and cookie behavior still need tests from final website/admin hostnames.
- No domain routes or Android client have been verified.

## Required next security work
1. Test bootstrap race, password hashing, login rate limits, session expiry/revocation and cookie behavior on live Worker.
2. Add password change and session revoke-all controls.
3. Add staff CRUD with server-side least-privilege roles.
4. Add staff authorization tests against every protected endpoint.
5. Add inventory concurrency and cancellation replay tests in real D1.
6. Add private proof storage only after R2 eligibility and cost review.
7. Add CSRF strategy for final origin and deployment topology.
8. Review CSP, accessibility and XSS defenses when web clients are deployed.
9. Verify production origins exactly; never use wildcard CORS with credentialed admin sessions.
10. Keep credentials and customer personal/payment data out of Git and logs.
