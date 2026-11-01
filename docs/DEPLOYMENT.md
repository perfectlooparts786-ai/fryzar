# FRYZAR deployment and recovery

## Environments
- Local: local Worker runtime and local D1.
- Development/staging: isolated Worker and non-production D1.
- Production: dedicated database, verified domain routes, and production-only secrets.

The new application targets fryzar-core. Never point new development at legacy fryzar-production.

## Current development deployment

- D1 database: fryzar-core, APAC, ID 098238a6-1bda-4735-8f21-d925c7fe32de.
- Applied migrations: 0001_core.sql and 0002_checkout_integrity.sql.
- Wrangler migration tracker: d1_migrations contains both migration names.
- Worker: fryzar-api.
- Latest uploaded version: c0f0ecf8-97ef-4768-a947-f3f56be0df8e.
- Latest deployment: 9faa976e-e399-46c3-9cd6-e01190d101e7, with 100% traffic on the uploaded version.
- workers.dev enabled, previews disabled.
- DB binding points to fryzar-core.
- TRACKING_SECRET exists as a Worker secret binding. Never read or print its value.
- APP_ENV remains development. ALLOWED_ORIGINS contains only localhost development origins.
- API hostname: https://fryzar-api.perfectlooparts786.workers.dev.
- Live HTTP/runtime test has not succeeded from the current tool environment, so deployment metadata is not proof that endpoint behavior works.
- No customer/admin web application is deployed.

## Legacy resources and domain protection

The older fryzar-app and fryzar-admin Workers and fryzar-production D1 database remain untouched. No custom domain or production route was changed. Preserve the fryzar.com Apple verification TXT record.

## Local workflow

~~~bash
npm install
npm run db:migrate:local
npm run dev:api
npm run typecheck
npm run test:api
~~~

The remote migrations have already been applied and recorded. Future migrations should use the normal Wrangler workflow only after reviewing the SQL and confirming the selected D1 binding.

## Remote workflow

Before applying remote migration:
1. Confirm the selected account, database name and ID.
2. Inspect the pending SQL diff.
3. Confirm the correct migration history.
4. Preserve the recovery path.
5. Apply only the reviewed migration.
6. Read back schema and migration history.

Before deploying:
1. Confirm Worker name and D1 binding.
2. Confirm development or production environment variables.
3. Verify required secret binding names without exposing their values.
4. Confirm exact allowed browser origins.
5. Deploy to the isolated Worker first.
6. Test every enabled API endpoint externally.
7. Capture deployment version and rollback target.

Production DNS, Worker routes, secret rotation, payment activation, and public ordering are separate release actions.

## Cost controls

Prefer Cloudflare Free resources. Monitor D1 and Workers account-wide limits. Do not enable a paid plan, R2, paid gateway, or third-party billing service without checking eligibility and getting approval where charges may apply.

R2 is not configured in this branch. Check account eligibility and free-tier usage before enabling private payment-proof uploads.

## Rollback

Keep the previous known-good Worker version. Version every schema change. Use documented D1 backup/recovery before risky production work. Do not delete legacy Workers, databases, or DNS records during the rebuild.
