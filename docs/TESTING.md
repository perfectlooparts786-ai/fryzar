# FRYZAR testing strategy

No build, type-check, automated test, live API, or end-to-end result is claimed yet. Validate the initial source before deployment.

## API and database
- Health checks DB connectivity and migration readiness.
- Category/product queries return only active and available records.
- Public config returns only allowlisted settings.
- Invalid filters and limits are rejected or safely bounded.
- User values are parameterized, never concatenated into SQL.
- Missing migration and database errors return controlled responses.
- Errors reveal no SQL, stack trace, secret, or customer data.

## Checkout and inventory (planned)
- Server-side prices, stock, fees, and totals are authoritative.
- Invalid products, quantities, zones, and store state are rejected.
- Idempotent retries return the original response.
- Reusing a key with a different payload is rejected.
- Concurrent checkout cannot oversell.
- Failed writes cannot leave partial orders or stock changes.
- Cancellation restores stock exactly once.
- Order-item snapshots preserve charged names and prices.

## Staff and admin (planned)
- Test one-time bootstrap, login, logout, expiry, revocation, password change.
- Test each role against sensitive endpoints.
- Test invalid/expired sessions, login throttling, origin/CSRF controls.
- Verify audit events for sensitive operations.

## Payments (planned)
- COD remains due until authorized collection is recorded.
- Manual transfer creates an associated payment record.
- Unsupported, oversized, or mismatched files are rejected.
- Proofs remain private.
- Upload does not mark payment verified.
- Verification checks authorization, amount, reference, replay protection, and audit.
- Rejection requires a reason.

## End-to-end (planned)
- Customer: browse, filter, cart, checkout, confirmation, tracking, locale switch.
- Admin: sign-in, catalog, inventory, order states, delivery, payment review, staff controls.
- Android: equivalent critical customer flows against the same API.
- Urdu RTL and English LTR on mobile, tablet, and desktop.

Report automated, browser, and device tests separately.
