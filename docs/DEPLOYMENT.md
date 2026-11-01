# FRYZAR deployment and recovery

## Current development environment
- D1: \`fryzar-core\`, APAC, ID \`098238a6-1bda-4735-8f21-d925c7fe32de\`.
- Applied/recorded migrations: \`0001_core.sql\`, \`0002_checkout_integrity.sql\`, \`0003_admin_bootstrap.sql\`.
- Worker: \`fryzar-api\`, workers.dev enabled.
- D1 binding: \`DB\` → fryzar-core.
- Existing secret: \`TRACKING_SECRET\` (value must never be exposed).
- Missing secret: \`OWNER_BOOTSTRAP_TOKEN\` (required before first owner can be created).
- Current recorded deployed Worker version predates latest repository source. Redeploy only after current CI and source review.
- Wrangler source configuration permits the local development customer/admin origins on ports 5173/5174. Runtime settings must be reconciled with this config at the next controlled deployment.
- No public domain/custom Worker routes. Preserve the Apple verification TXT record.

## Legacy resources
\`fryzar-app\`, \`fryzar-admin\`, and \`fryzar-production\` remain untouched. Do not point the new app to the legacy database.

## Local development

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

## Remote migration procedure
1. Confirm the selected Cloudflare account and exact D1 name/ID.
2. Review the complete migration SQL.
3. Confirm the current \`d1_migrations\` history.
4. Preserve a recovery path.
5. Apply only the reviewed migration.
6. Read back schema, constraints, triggers and migration record.

Do not reset or seed production. Development and test data must be clearly segregated from genuine business data.

## Controlled API deployment
1. Confirm the exact commit passed full CI.
2. Build the Worker from the committed source.
3. Confirm \`DB\` is the fryzar-core database for development.
4. Confirm APP_ENV=development and exact allowed origins.
5. Ensure TRACKING_SECRET exists; add OWNER_BOOTSTRAP_TOKEN separately when first-owner setup is deliberately opened.
6. Deploy to the isolated fryzar-api Worker.
7. Verify health, public catalog, delivery-zone and protected admin flows through a real browser/client.
8. Record version ID and rollback target.
9. Keep public checkout closed.

## Web deployment
Customer and admin build artifacts are built independently. Deploy to separate preview hostnames first, configure exact API origins and credentialed CORS, then test cookie scope and HTTPS. No public domain route is currently configured.

## Cost controls
Prefer existing Cloudflare/GitHub free resources. R2 is not activated. Check eligibility, monthly included usage, overage rates and storage access controls before enabling payment-proof uploads. No paid plan, subscription, payment gateway or paid media service without approval.

## Rollback
Keep legacy systems unchanged. Preserve the prior known-good Worker version and database migration records. Use a documented D1 backup/restore process before production schema or data changes.
