# FRYZAR testing strategy

## Earlier verified run
GitHub Actions previously passed strict TypeScript validation, 17/17 API tests and the customer storefront production build on commit \`1607be7\`.

## Latest verified combined validation
GitHub Actions run 41271949570 on commit \\`8633e41d8a284c95713cefde5be5ac7543aeeb51\\` passed all pipeline steps: API strict TypeScript validation, 70/70 Node API tests, customer storefront production build, and admin portal production build.


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


## Staff lifecycle and role tests
- Owner can create a manager account; generated password hash is not stored as plaintext and create action is audited.
- Manager can create operational roles but cannot create managers or owners.
- Staff directory response does not select or expose password hashes; operational users cannot access the directory.
- Managers cannot manage other managers. Owner-role targets are protected.
- Self-deactivation is rejected. Role changes revoke all target sessions and are audited.
- Password reset uses the existing PBKDF2-SHA256 hashing function, revokes sessions and creates an audit entry.
- Staff feature is CI-tested only. No real staff accounts were added to D1, and owner bootstrap secret is still absent.

## Customer order tracking
- Existing API tracking test verifies returned order summary omits phone number and delivery address.
- Client validates a 64-character hex token before requesting tracking data.
- UI displays status and lifecycle, timestamps, item snapshots, line totals and payment state in English/Urdu, without showing delivery contact data.
- Track page token is held in page state only and not written to local storage.
- GitHub Actions run 41271663890 passed 62/62 mocked API tests, strict API TypeScript validation and both web builds.
- The storefront build confirms compilation; no automated browser E2E run or live Worker tracking request has been completed.


## COD collection validation
- Finance can list COD records without customer contact/address columns. Operator access is denied.
- Finance can collect a delivered unpaid COD order; the D1 batch writes order and payment state, collector identity, reviewed timestamp, audit record and idempotency response.
- Non-delivered orders cannot be collected. Non-COD payment methods are rejected.
- Collection requires an Idempotency-Key. Identical retry replays the same response; the same key with a different order payload is rejected.
- Tests cover delivered gate, non-COD gate, unauthorized list access, response replay and key-payload mismatch.
- GitHub Actions run 41271949570 passed 70/70 mocked API tests plus TypeScript and both web builds.
- Live D1 transaction rollback/concurrency and live Worker API verification remain pending. No real payment state was changed.


## Dashboard metrics validation — pending CI
- Added mocked API coverage for aggregate dashboard metrics and access denial for rider accounts.
- The metrics endpoint is designed to return counts and aggregate delivered revenue only, with no customer contact/address fields.
- Latest dashboard-metrics tests are committed but have not yet been confirmed in a successful CI run.
- Real D1 query execution and live authenticated Worker integration remain pending.

- Follow-up test explicitly asserts that the dashboard aggregate SQL query does not select `customer_phone` or `delivery_address`; commit `4e0ac438e665d395e8959f4463f6edc77fe97805`. CI result for the current head is not yet confirmed.
