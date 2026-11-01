# FRYZAR

FRYZAR is a fresh-build bilingual Urdu and English ordering platform for food, grocery, and local products.

## Target product
- Customer website
- Customer Android application
- Admin operations dashboard
- Secure Cloudflare Worker API
- Cloudflare D1 catalogue, orders and inventory
- Guest checkout, order tracking and COD
- Future manual-transfer proof and review workflow
- Delivery zones, customer support, Urdu RTL and English LTR
- Monitoring, backup, recovery and production release controls

## Current engineering state

- Private GitHub repository: \`perfectlooparts786-ai/fryzar\`
- Active development branch: \`foundation/fresh-build\`
- New D1 database: \`fryzar-core\`, APAC
- New API Worker: \`fryzar-api\`, isolated workers.dev deployment
- Customer React storefront source: implemented; its initial production build passed CI before the latest API/admin changes
- Admin React portal source: authentication, overview, Orders, Catalogue and Inventory modules added; latest CI run passed 39/39 API tests and both web builds
- Inventory: admin stock receipt/return/correction workflow, movement history, idempotency and audit implemented in source; migration 0004 applied to development D1\n- Delivery zones: owner/manager create/update/deactivate API and admin UI implemented; not live-deployed\n- Store settings: guarded owner/manager configuration API and admin UI; release-gated settings are read-only and store opening is blocked in this module\n- Customer order tracking: bilingual lookup UI, lifecycle and amount details; token is not persisted and contact/address are omitted; live Worker check pending\n- COD collection: owner/manager/finance can record delivered COD collection with atomic order/payment/audit/idempotency updates; not live-deployed\n- Staff lifecycle: owner/manager account creation, role/status changes, password resets and session revocation; invitation email not implemented\n- Android client: not started
- Production domain routes: not configured
- Store: remains in setup mode; checkout is closed

This is a development branch. The draft pull request is intentionally not merged until the current CI and runtime/database checks are complete.

## API surface in source

- \`GET /api/v1/health\`
- \`GET /api/v1/categories\`
- \`GET /api/v1/products\`
- \`GET /api/v1/storefront-config\`
- \`GET /api/v1/delivery-zones\`
- \`POST /api/v1/orders\`
- \`GET /api/v1/orders/track/{token}\`
- \`POST /api/v1/admin/bootstrap-owner\`
- \`POST /api/v1/admin/login\`
- \`POST /api/v1/admin/logout\`
- \`GET /api/v1/admin/session\`
- \`GET /api/v1/admin/orders\`
- \`GET /api/v1/admin/orders/{id}\`
- \`PATCH /api/v1/admin/orders/{id}/status\`\n- \`GET /api/v1/admin/categories\` and \`POST/PATCH /api/v1/admin/categories\`\n- \`GET /api/v1/admin/products\` and \`POST/PATCH /api/v1/admin/products\`\n- \`GET /api/v1/admin/inventory/movements\`\n- \`POST /api/v1/admin/inventory/adjustments\`

The latest API source has not yet been redeployed to the Worker. Catalogue and inventory endpoints are source/CI-tested but not live. Do not assume endpoints added after the recorded Worker version are live.

## Safety and launch status

- Checkout requires a valid idempotency key.
- Money is calculated from trusted D1 product prices and active delivery-zone settings.
- COD creates an unpaid payment record.
- Manual transfer remains disabled. Private proof storage and financial review are not implemented.
- Order cancellation source includes an exactly-once stock-restoration design, but real D1 concurrency testing is pending.\n- Manual inventory changes are owner/manager-only, require an idempotency key and use an adjustment ledger, inventory movement and audit record. Direct product stock edits are blocked after creation.
- Staff passwords are PBKDF2-SHA256 hashes. Sessions use opaque tokens stored as hashes and an HttpOnly/Secure/SameSite=Strict cookie.
- The first-owner bootstrap requires a separate Cloudflare secret named \`OWNER_BOOTSTRAP_TOKEN\`. It is not configured yet.
- No seeded demo products or fake business details have been added.
- No legacy Worker, legacy database, public DNS record, or production route has been changed.
- No paid subscription or paid storage has been activated.

## Development commands

~~~bash
npm install
npm run db:migrate:local
npm run dev:api
npm run dev:storefront
npm run dev:admin
npm test
npm run build:storefront
npm run build:admin
~~~

The remote database already has migrations \`0001_core.sql\`, \`0002_checkout_integrity.sql\`, and \`0003_admin_bootstrap.sql\` recorded. Review every future migration before applying it remotely.

## Main project documents
- \`docs/PROJECT_STATE.md\`
- \`docs/IMPLEMENTATION_PLAN.md\`
- \`docs/TASK_BACKLOG.md\`
- \`docs/ARCHITECTURE.md\`
- \`docs/SECURITY_REVIEW.md\`
- \`docs/TESTING.md\`
- \`docs/DEPLOYMENT.md\`
- \`docs/RELEASE_READINESS.md\`

## License
No open-source license has been selected. All rights remain reserved by the project owner unless a license is added.


## Latest development note
- Dashboard metrics API/UI has been added on the development branch: aggregate order counts, delivered revenue, unpaid COD, low stock, active products/categories/zones, and store readiness.
- API tests cover metrics output, PII exclusion in the query, and rider access denial. Latest source is committed, but a fresh successful CI run for these dashboard changes still needs confirmation.
