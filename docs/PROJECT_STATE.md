# FRYZAR project state

**Last updated:** 2026-11-01  
**Active branch:** \`foundation/fresh-build\`  
**Current phase:** Fresh platform foundation, customer storefront, admin authentication and order operations source. Latest full GitHub Actions validation passed.

## Verified infrastructure

- Private repository \`perfectlooparts786-ai/fryzar\`; active development branch \`foundation/fresh-build\`; draft PR #1 remains unmerged.
- New Cloudflare D1 database \`fryzar-core\`, APAC, ID \`098238a6-1bda-4735-8f21-d925c7fe32de\`.
- Migrations \`0001_core.sql\`, \`0002_checkout_integrity.sql\`, and \`0003_admin_bootstrap.sql\` applied and recorded in \`d1_migrations\`.
- The new database has the application schema plus the migration tracker. Its initial catalogue and order-related tables are empty; no products, delivery zones, staff accounts, orders, or payments have been fabricated.
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

- Latest GitHub Actions run 41266597656 on commit \\`44ce7ecd861f385dd636a7382ed861eeb24b5188\\` passed: strict TypeScript, all 28 API tests (28 passed, 0 failed), customer storefront build, and admin portal build.
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
