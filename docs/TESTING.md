# FRYZAR testing strategy

## Earlier verified run
GitHub Actions previously passed strict TypeScript validation, 17/17 API tests and the customer storefront production build on commit \`1607be7\`.

## Latest verified combined validation
GitHub Actions run 41270993539 on commit \\`ab5557a39c3cfa281cd425f882645efb263a6708\\` passed all pipeline steps: API strict TypeScript validation, 51/51 Node API tests, customer storefront production build, and admin portal production build.


- Added first-owner bootstrap and secure session endpoints.
- Added bootstrap claim migration 0003.
- Added role-aware admin order list/detail and status transitions/cancellation restock.
- Added six bootstrap/login/session tests and five order authorization/cancellation tests.
- Added admin React portal, Orders UI and admin production build step.

The expanded API suite contains 39 tests. All passed in the latest CI run. These are mocked API tests, not live D1 transaction/concurrency tests.

## Mock API coverage
- Health and schema readiness.
- Categories/products/config behavior.
- Exact CORS origin and preflight handling.
- Mandatory checkout idempotency.
- Store-not-open and manual-transfer-disabled guards.
- Mocked COD checkout amount, payment row, batch composition and tracking-token response.
- Tracking PII minimization.
- Owner bootstrap origin/claim/password policy and secure cookie.
- Admin login success/failure and session behavior.
- Finance role cannot list orders.
- Kitchen order query omits customer phone/address.
- Invalid status filter and kitchen cancellation rejection.
- Manager cancellation batch includes stock restoration, movement, status history and audit.
- Inventory adjustment requires owner/manager role, tracked stock, non-zero integer delta, and Idempotency-Key.
- Inventory adjustment prevents negative quantities, writes adjustment + movement + audit in one batch, replays the same response for the same key, and rejects key reuse with a different payload.
- Product creation with opening stock records the opening adjustment and inventory movement. Product PATCH cannot bypass the inventory ledger.\n- Delivery zone create/update validates fields and writes an audit entry in the same D1 batch. Roles are enforced and duplicate zone codes return a conflict. Deactivation updates \\`is_active\\` without deleting historical references.

Mock tests validate the code's request/control behavior, not Cloudflare D1 transactional semantics.

## Required D1 integration tests
- Apply the migrations to a separate test database.
- Read schema and all migration entries.
- Confirm D1 batch rollback on injected failure.
- Repeat equivalent checkout idempotency request and test mismatched payload.
- Concurrent checkout against one remaining stock item.
- Verify no negative stock or duplicate reserve movement.
- Race two cancellation requests and prove inventory is restored once.
- Test payment/order state consistency and foreign-key integrity.
- Bootstrap two simultaneous first-owner requests and prove only one succeeds.
- Login/session creation/revocation and expiry from actual Worker.

## Browser and device tests
Customer: load catalogue, change language, category/search, cart, checkout validation, server-calculated total, confirmation and tracking.
Admin: bootstrap, login/logout, role-based data projection, order status transition and cancellation.
Android: equivalent customer flows after native app exists.
Test English LTR and Urdu RTL on mobile, tablet and desktop. Distinguish CI, D1 integration, browser E2E and Android device tests.


## Development D1 migration verification
- Migration \`0004_inventory_adjustments.sql\` was applied to the isolated development D1 database \`fryzar-core\` and added to \`d1_migrations\`.
- Read-back confirmed the \`inventory_adjustments\` table, its columns, its product/actor foreign keys, the product-created index and the unique adjustment-movement index.
- Read-back confirmed zero products, zero adjustment rows and zero inventory movement rows. No fake business data was seeded.
- This schema verification is not an API integration test.

## Additional required inventory D1 integration tests
- Execute the real API write batch against a separate test database or controlled fixture and verify product quantity, previous/new values, adjustment row, movement row, audit row and idempotency row commit together.
- Force the product UPDATE to affect zero rows and verify \`changes()\` prevents all dependent ledger and idempotency inserts.
- Race two adjustments with different keys against the same stock and prove no negative quantity.
- Race identical requests with the same Idempotency-Key and prove exactly one adjustment is committed and the second response is a replay.
- Inject a failure after the quantity update and prove D1 batch rollback restores quantity and leaves no partial ledger rows.


## Delivery-zone validation coverage
- Owner/manager create and update/deactivation requests.
- Integer paisa amount and code/name/location validation.
- Operator write denial and rider read access.
- Duplicate zone code conflict mapping.
- Read-only D1 schema verification confirms the API fields align with the existing \`delivery_zones\` schema. No live zone records were created.
- Live Worker HTTP and real D1 audit-batch tests remain pending because the current Worker deployment is behind the GitHub source.


## Store-settings validation coverage
- Read settings through the authenticated admin endpoint, restricted to public setting rows.
- Owner/manager update of store names, default language, COD flag, WhatsApp contact, and setup/paused mode.
- Audit log write is included in the settings D1 batch.
- Reject malformed international contact numbers and unknown settings.
- Reject \`launch_ready\`, \`manual_transfer_enabled\`, currency and \`store_status=open\` changes from the admin settings endpoint.
- The admin portal displays release-gated status read-only; no live settings were changed.
- Latest CI run 41270993539 passed 51/51 mocked API tests plus TypeScript and both web builds. Authenticated live Worker/D1 integration is still pending.
