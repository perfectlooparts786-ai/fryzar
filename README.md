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
- Admin React portal source: authentication screens, live overview and Orders module added; latest combined CI run pending
- Android client: not started
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
- \`PATCH /api/v1/admin/orders/{id}/status\`

The latest API source has not yet been redeployed to the Worker. Do not assume endpoints added after the recorded Worker version are live.

## Safety and launch status

- Checkout requires a valid idempotency key.
- Money is calculated from trusted D1 product prices and active delivery-zone settings.
- COD creates an unpaid payment record.
- Manual transfer remains disabled. Private proof storage and financial review are not implemented.
- Order cancellation source includes an exactly-once stock-restoration design, but real D1 concurrency testing is pending.
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
