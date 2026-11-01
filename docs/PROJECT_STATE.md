# FRYZAR project state

**Last updated:** 2026-11-01  
**Active branch:** \`foundation/fresh-build\`  
**Current phase:** Fresh platform foundation plus CI-tested catalogue, inventory, delivery zones, guarded store settings, staff management, customer order tracking and COD collection source. Development D1 migration 0004 is applied; Worker deployment is still behind GitHub source.

## Verified infrastructure

- Private repository \`perfectlooparts786-ai/fryzar\`; active development branch \`foundation/fresh-build\`; draft PR #1 remains unmerged.
- New Cloudflare D1 database \`fryzar-core\`, APAC, ID \`098238a6-1bda-4735-8f21-d925c7fe32de\`.
- Migrations \`0001_core.sql\`, \`0002_checkout_integrity.sql\`, and \`0003_admin_bootstrap.sql\` applied and recorded in \`d1_migrations\`.
- The new database has the application schema plus the migration tracker. Products, delivery zones, staff accounts, orders, payments, inventory adjustments and inventory movements remain empty; no business or demo rows have been fabricated. Migration 0004 adds the auditable \`inventory_adjustments\` ledger and movement uniqueness index.
- New Cloudflare Worker \`fryzar-api\` deployed to its isolated workers.dev hostname and bound to \`fryzar-core\` using \`DB\`.
- \`TRACKING_SECRET\` is configured on the Worker. Secret values are never committed or displayed.
- Recorded deployed Worker version \`c0f0ecf8-97ef-4768-a947-f3f56be0df8e\` had 100% traffic at the last deployment check. That deployment predates the latest delivery-zone, admin-auth and admin-order source changes; the live Worker is therefore behind GitHub source.
- Worker runtime still has the earlier development-origin configuration. The repository's Wrangler config now includes the local admin origin on port 5174, but it has not yet been deployed.
- \`OWNER_BOOTSTRAP_TOKEN\` is not configured. The bootstrap endpoint will correctly remain unavailable until that secret is added.
- The existing \`fryzar-app\`, \`fryzar-admin\`, and \`fryzar-production\` resources are legacy and remain untouched.
- \`fryzar.com\` has no new Worker route or production hostname. Its existing Apple-verification TXT record has not been changed.
- R2 has not been activated. No Android source or APK has been verified.

## Source implemented

### API
- Public health, category, product, storefront-config, and delivery-zone read routes.
- Guest checkout with strict payload validation, mandatory idempotency key, server-authoritative price calculation and a single D1 batch for the order, payment, item snapshots, stock reservation, status history, and audit record.
- COD payment is recorded as unpaid. Manual transfer is disabled in store settings.
- HMAC-derived order-tracking token; only its SHA-256 hash is stored. The tracking response omits customer phone and delivery address.
- IP-hash rate limiting for checkout and tracking.
- One-time owner bootstrap with PBKDF2-SHA256 password hashing, atomic bootstrap claim, hashed opaque session token, 8-hour HttpOnly/Secure/SameSite=Strict cookie, login/logout/session endpoints.
- Role-aware order list/detail endpoints. Kitchen responses omit customer contact/address. Owner/manager cancellation source restores tracked stock, adds inventory movement, status history and audit in a conditional D1 batch.
- The latest admin/auth/order API source has not yet been deployed or verified against real D1 concurrency.

### Customer website
- React + TypeScript source with bilingual language switch, RTL/LTR layout, live categories/products/delivery areas, search, cart, server-backed COD checkout, order confirmation and tracking-token display.
- Empty catalogue state shows no fake products/prices.
- CI previously passed a customer storefront build before the latest admin/API changes. The current combined workflow still needs to validate all recent commits.

### Admin portal
- React + TypeScript source with owner setup/login, session restoration, overview, live public configuration data, role display, logout and order operations UI.
- Product, inventory, payments, delivery management, staff management and editable settings screens are still pending.
- The owner bootstrap UI requires an operator-provided token; no default password is created.

## Test state

- Latest full GitHub Actions run 41270463960 on commit \\`0f6efdd838ea4426f2949cde835701e594fd2dcd\\` passed: strict TypeScript validation, all 39 API tests (39 passed, 0 failed), customer storefront production build, and admin portal production build.
- Owner bootstrap/session tests, order RBAC/cancellation tests, admin portal source, and admin build step are included in the passing combined CI run.
- Tests use mocked D1 statements. They do not establish live D1 transaction rollback, concurrency behavior, or live Worker HTTP behavior.
- The Cloudflare deployment metadata is not proof that all API endpoints respond correctly. External HTTP checks from the tool environment have been unavailable.

## Store is not open

- \`store_status=setup\`
- \`launch_ready=false\`
- \`manual_transfer_enabled=false\`
- No real catalogue, delivery areas, owner account, bank details, customer support number, or business content has been entered.

Checkout must remain unavailable until the owner supplies genuine business configuration and all release gates pass.

## Immediate work
1. Validate the latest API, auth and admin source with CI.
2. Resolve any schema/runtime mismatch from real D1 read-only checks.
3. Add admin product/category/delivery/settings APIs and UI.
4. Complete COD collection and manual-transfer proof workflow only after secure private storage is available and cost/eligibility are reviewed.
5. Implement customer order tracking screen and support configuration.
6. Build Android client against the stable API contract.
7. Deploy updated API to isolated development Worker and verify live HTTP.
8. Build and deploy web apps to an isolated preview environment.
9. Only then plan production domain and release.


## Development update — 2026-11-01

- Added owner/manager-protected admin category and product list/create/update API routes in commit `507cd77` and follow-up validation fix in `71511c4`.
- Added the admin API client and catalogue screen with product/category forms, edit actions, empty states, validation error display, and responsive styling. The screen collects prices in paisa and shows empty catalogue states without fake data.
- Category/product writes produce audit log entries. Product stock can be set through the product form, but a dedicated reasoned inventory-adjustment workflow with movement records is still not implemented.
- CI run 41269693927 passed on commit `507cd77` for API type-check/tests and both web builds. That run predates the subsequent admin UI and follow-up commits. The newest combined source must be treated as awaiting fresh CI validation until a run for the latest commit is confirmed.
- No deployment was performed. The live Worker is still known to be behind GitHub source. No real products, categories, stock values, or delivery zones were added to D1.


## Development update — inventory management (2026-11-01)

- Admin catalogue API and UI are now CI-tested. Product/category create, update and list operations are owner/manager write-protected and audit logged.
- Product stock can be initialized when a new product is created. Initial positive stock is recorded in \`inventory_adjustments\` and \`inventory_movements\` in the same D1 batch as product creation.
- Product PATCH rejects direct \`stock_qty\` edits with \`inventory_adjustment_required\`. Subsequent stock changes must use the inventory adjustment workflow.
- Added \`POST /api/v1/admin/inventory/adjustments\` with owner/manager authorization, required \`Idempotency-Key\`, 24-hour replay protection, stock non-negative guard, and atomic product quantity + adjustment ledger + movement + audit writes.
- Added \`GET /api/v1/admin/inventory/movements\` with owner/manager/operator/kitchen read access and product filtering.
- Admin portal now has a Current Stock table, stock receipt/return/correction form, and filtered adjustment history. Existing unlimited/untracked products are shown distinctly and are not eligible for quantity changes until tracking is explicitly enabled in a future step.
- Added API test coverage for role access, insufficient/untracked stock, idempotent replay, key reuse with a different payload, batch concurrency guard, opening-stock ledger records, and preventing stock edits through product PATCH.
- GitHub Actions run 41270463960 passed on commit \`0f6efdd838ea4426f2949cde835701e594fd2dcd\`: 39/39 API tests passed, TypeScript validation passed, storefront build passed, and admin build passed.
- D1 migration \`0004_inventory_adjustments.sql\` was applied to the isolated development database \`fryzar-core\` (ID \`098238a6-1bda-4735-8f21-d925c7fe32de\`). The migration tracker, table columns, both indexes and zero-row counts were read back successfully.
- No product, staff, order, or inventory fixtures were inserted. The current Worker deployment is still older than GitHub source; live Worker API tests and real D1 concurrency/rollback tests remain pending.


## Development update — delivery-zone management (2026-11-01)

- Added authenticated \`GET /api/v1/admin/delivery-zones\` for owner/manager/operator/kitchen/rider roles. The admin read returns active and inactive zones so historical records remain visible.
- Added owner/manager-only \`POST /api/v1/admin/delivery-zones\` and \`PATCH /api/v1/admin/delivery-zones/{id}\`. Permanent delete is not supported; deactivation preserves zone references used by existing orders.
- Server validation covers zone code, English/Urdu names, country code, region/city, integer paisa delivery fee and minimum order, and active status. Zone create/update and audit write share one D1 batch.
- Admin portal now includes a Delivery Zones module with create/edit/deactivate form and full zone listing. It shows values in PKR, while inputs and storage use integer paisa.
- Added six API tests for create/audit batch, update/deactivation, validation, authorization, rider read projection and duplicate-code conflicts. One initial test run failed two assertions because the action is a bound SQL parameter; tests were corrected to inspect the parameter values.
- GitHub Actions run 41270769486 passed on commit \`95af500df33e8c79981097bc22123da5f7a63aeb\`: 45/45 API tests, API strict TypeScript validation, storefront build and admin build.
- Read-only Cloudflare D1 verification confirmed the existing \`delivery_zones\` schema matches the API columns and there are currently zero configured zones. No delivery-zone data was added.
- No new D1 migration was needed for delivery zones. The current Worker is still behind GitHub source; Delivery APIs/UI are implemented and CI-tested, not deployed/live-verified.


## Development update — guarded Store Settings (2026-11-01)

- Added authenticated \`GET /api/v1/admin/settings\` for staff roles; the query is restricted to \`is_public = 1\` settings only.
- Added owner/manager-only \`PATCH /api/v1/admin/settings\` for English/Urdu store names, default language, COD enablement, WhatsApp contact and non-open store mode (setup/paused).
- Settings are strictly allowlisted and validated. All setting upserts and the \`store.settings_updated\` audit entry are sent in one D1 batch.
- \`launch_ready\`, \`manual_transfer_enabled\`, and currency are release-gated and cannot be edited from this endpoint. \`store_status=open\` is rejected; only setup or paused can be selected here.
- Admin portal now exposes Store Settings with launch-readiness and manual-transfer read-only status indicators. Supported Urdu/English languages and PKR remain fixed.
- Added tests for public settings read, owner/manager update and audit, blocked launch/manual-transfer changes, blocked store opening, operator write denial, valid international phone acceptance, and invalid contact rejection.
- Latest GitHub Actions run 41270993539 passed on commit \`ab5557a39c3cfa281cd425f882645efb263a6708\`: 51/51 API tests passed, TypeScript validation passed, storefront build passed and admin build passed.
- No real store settings or contact number were changed in D1. The admin feature is source/CI-tested but has not been deployed to the Worker or tested against authenticated live D1 sessions.


## Development update — staff access and customer tracking (2026-11-01)

### Staff management
- Added \`GET/POST /api/v1/admin/staff\`, \`PATCH /api/v1/admin/staff/{id}\`, and \`POST /api/v1/admin/staff/{id}/reset-password\`.
- Owner/manager access is enforced in the API. Owners may create manager and operational roles; managers may create only operational roles. No staff route allows creation of another owner.
- Staff list omits password hashes. Create and password-reset operations hash passwords with the existing PBKDF2-SHA256 routine.
- Role/deactivation changes and password resets revoke active staff sessions and write audit records. Owner role targets and manager-managed manager targets are protected; self-deactivation returns a conflict.
- Team Access admin UI supports staff directory, account creation, role/status edit and password reset.
- No invitation email delivery exists yet. Initial passwords are set during account creation and must be shared separately through a secure channel.
- CI run 41271345375 passed on commit \`85a3004d912b2b24b5b81d155eebd18fb78994af\`: 62/62 API tests, TypeScript, storefront build and admin build.
- No staff account was inserted into the development D1 database. \`OWNER_BOOTSTRAP_TOKEN\` is still not configured; live first-owner setup has not occurred.

### Customer order tracking
- Added typed customer API client for \`GET /api/v1/orders/track/{token}\`, validating the 64-character hexadecimal tracking token before lookup.
- Added bilingual customer order tracking section, with desktop navigation and a mobile header shortcut.
- Tracking page displays order number/status, order lifecycle timeline, timestamps, product line snapshots, quantities, prices, subtotal, delivery, total and payment state.
- The page does not display customer phone or delivery address and does not persist the private tracking token in browser storage.
- Order confirmation includes a direct "Track order" action.
- Latest GitHub Actions run 41271663890 passed on commit \`f6be27b0d89ad19cc50347347495100cb48f22e9\`: 62/62 API tests, API TypeScript validation, customer storefront build and admin build.
- The public tracking API already had token hashing, response PII omission and rate limiting. The latest Worker still predates these features and has not been redeployed; no live customer tracking session has been tested.


## Development update — COD collection (2026-11-01)

- Added authenticated \`GET /api/v1/admin/payments\` for owner, manager and finance roles. It lists COD payment records only, with order/payment status and amount fields. Customer phone and delivery address are not selected.
- Added \`POST /api/v1/admin/payments/cod-collection\` for owner, manager and finance. It requires a valid idempotency key and only collects a COD payment when the order status is \`delivered\` and both order/payment statuses are \`unpaid\`.
- A successful collection updates \`orders.payment_status\`, \`payments.status\`, collector/reviewer staff ID and review timestamp, audit event \`payment.cod_collected\`, and the idempotency response in one D1 batch.
- Duplicate request replay returns the saved response; a reused key with a different payload is rejected. A second collection or concurrent state change cannot silently repeat the payment update.
- Admin portal Payments module lists COD records, filters unpaid/collected, and enables collection only for delivered unpaid orders. Owner/manager/finance can record collection; other roles are read-only or denied by API.
- Latest GitHub Actions run 41271949570 passed on commit \`8633e41d8a284c95713cefde5be5ac7543aeeb51\`: 70/70 API tests, strict TypeScript, customer storefront build and admin build.
- No real payments or orders have been inserted or marked collected in the development D1. No live Worker deployment or authenticated payment integration test has been performed.
- This is COD collection recording only. Online gateway integration, manual bank-transfer proof, finance review/rejection, refunds, reconciliation and receipt exports remain unimplemented. Manual transfer remains disabled.


## Development update — operational dashboard metrics (2026-11-01)

- Added `GET /api/v1/admin/metrics`, returning aggregate-only metrics from D1: total/open/delivered orders, delivered order revenue, unpaid COD count, active products/categories/zones, and tracked low-stock product count (threshold quantity <= 5).
- Dashboard endpoint requires an authenticated staff session and is restricted to owner, manager, operator, kitchen and finance roles; rider/support roles are denied. The response does not select or return customer contact/address fields.
- Admin API client now has a typed metrics response. Overview loads metrics from the API and displays order, revenue, COD and low-stock cards alongside store readiness.
- Updated stale overview checklist copy to reflect that order management and COD collection recording are available in source.
- Added two API tests for aggregate metrics response and rider-role denial. These tests and the combined latest source still require a fresh CI run; do not label this change CI-tested until that run succeeds.
- Latest known completed CI evidence remains run 41271949570 on commit `8633e41d8a284c95713cefde5be5ac7543aeeb51` (70/70 API tests and both builds), which predates the dashboard metrics change.
- No deployment, live D1 write, live account creation, or real payment mutation was performed.
