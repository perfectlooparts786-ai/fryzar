# FRYZAR deployment and recovery

## Environments
- Local: local Worker runtime and local D1.
- Development/staging: isolated Worker and non-production D1.
- Production: dedicated database, verified domain routes, and production-only secrets.

New application development targets fryzar-core. Never point the new application at legacy fryzar-production.

## Current development deployment
- New D1: fryzar-core, APAC, ID 098238a6-1bda-4735-8f21-d925c7fe32de.
- Migration 0001_core.sql has been applied through the Cloudflare D1 API.
- New Worker: fryzar-api.
- Worker version tag: b837d2a9c9e54e5fb208bfcd61e03928.
- Deployment: e95c5844-debf-4e06-8052-974b81328987, with 100% traffic assigned to the uploaded version.
- workers.dev is enabled; previews are disabled.
- DB binding points to fryzar-core.
- Development origins are localhost:5173 and 127.0.0.1:5173.
- Expected endpoint base: https://fryzar-api.perfectlooparts786.workers.dev.
- Live HTTP runtime tests have not succeeded from the current tool environment because the host could not be resolved. Do not interpret this as a confirmed Worker response.
- Wrangler migration tracking has not yet been reconciled for the migration applied through the REST API.

## Legacy resources
The older fryzar-app and fryzar-admin Workers and fryzar-production D1 database remain untouched. No custom domain or production route was changed. Preserve the existing fryzar.com Apple verification TXT record.

## Local workflow
Install dependencies, apply local migrations, run the Worker locally, and type-check. The checked-in commands are:
~~~bash
npm install
npm run db:migrate:local
npm run dev:api
npm run typecheck
~~~

Before using remote Wrangler migrations, first reconcile the existing remote schema with Wrangler's migration tracking so migration 0001 is not re-executed.

## Remote workflow
Before remote migration, verify the selected account, database name and ID, migration diff, and recovery path. Apply only reviewed migrations. Read back the schema and seeded settings.

Before deployment, verify Worker name, D1 binding, origins, environment variables, and secrets. Deploy only the isolated Worker first, then test health and every enabled endpoint. Capture the deployment version and rollback target.

Production routes, DNS, secret rotation, payment activation, and public ordering are separate release actions.

## Cost controls
- Cloudflare D1 Free currently includes 10 databases, 5 GB total storage, 5 million rows read per day, and 100,000 rows written per day. Limits are account-wide.
- Workers Free currently includes 100,000 requests per day and 10 ms CPU per invocation.
- Monitor usage. If limits are inadequate, stop and present alternatives/cost before upgrading.
- R2 is not configured in this branch. Check account eligibility and free-tier usage before enabling private uploads.

## Rollback
Keep the previous known-good Worker version. Version schema changes. Use documented D1 backup/recovery before risky production work. Do not delete legacy Workers, databases, or DNS records during the rebuild.
