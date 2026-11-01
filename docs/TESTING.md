# FRYZAR testing strategy

## Current status

A Node test suite contains 16 mocked API scenarios and a GitHub Actions workflow has been committed. The expanded suite has not yet returned a verified CI result. Mock tests are not D1 integration or live Worker runtime tests.

## Current test coverage

- Health readiness and missing-schema handling.
- Generic database error behavior.
- Active category list behavior.
- Invalid category rejection before SQL.
- Product limit clamping and parameter binding.
- Public setting JSON parsing.
- Disallowed and approved browser origins.
- CORS preflight.
- Unknown route behavior.
- Mandatory checkout idempotency key.
- Store setup/launch gate.
- Manual-transfer-disabled gate.
- Mocked COD checkout total, payment status, and batch statement composition.
- Unknown tracking token rejection.

## Required database integration tests

- Apply the migrations to an isolated D1 database.
- Verify the d1_migrations history.
- Confirm the checkout D1 batch commits all writes together or rolls all back.
- Verify duplicate idempotency-key replay and mismatched-payload rejection.
- Simulate concurrent orders against a low stock count.
- Verify product unavailable, category inactive, delivery-zone inactive, and invalid price rejection.
- Confirm stock movements match stock quantity changes.
- Verify no negative stock is possible.
- Verify cancellation restores stock exactly once after that endpoint is implemented.
- Verify order tracking exposes no customer phone or street address.

## Required staff and payment tests

- Owner bootstrap, login, logout, expiry, revocation, password change.
- Missing, invalid, expired, and insufficient-role sessions.
- Role matrix against every sensitive endpoint.
- Login abuse throttling, CSRF/origin, and audit integrity.
- COD due/collected state and reviewer audit.
- Manual-transfer proof validation, private access, rejection, resubmission, amount/reference check, and replay protection.

## End-to-end (planned)

- Customer: browse, category filter, cart, checkout, order confirmation, tracking, language switch.
- Admin: login, catalog, inventory, order states, delivery configuration, payment review, staff permissions.
- Android: equivalent critical customer flows against the same API.
- Urdu RTL and English LTR on mobile, tablet, and desktop.

Automated tests, actual D1 integration tests, browser E2E, and device tests must be reported separately.
