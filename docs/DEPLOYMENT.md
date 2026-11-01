# FRYZAR deployment and recovery

## Environments
- Local: local Worker runtime and local D1.
- Development/staging: isolated Worker and non-production D1.
- Production: dedicated database, verified domain routes, production-only secrets.

The new database target is fryzar-core. Do not point new development commands at legacy fryzar-production.

## Current state
- fryzar-core exists in APAC.
- Initial SQL migration is in this branch but not applied.
- fryzar-api has not been deployed.
- No custom domain or production route was changed.
- Preserve the existing fryzar.com Apple verification TXT record.

## Local workflow

~~~bash
npm install
npm run db:migrate:local
npm run dev:api
npm run typecheck
~~~

## Remote workflow
Before remote migration, verify the selected account, database name and ID, migration diff, and recovery path. Apply only the reviewed migration. Read back the schema and seeded settings.

Before deployment, verify Worker name, D1 binding, origins, environment variables, and secrets. Deploy only the isolated Worker first, then test health and every enabled endpoint. Capture the deployment version and rollback target.

Production routes, DNS, secret rotation, payment activation, and public ordering are separate release actions.

## Cost controls
- Cloudflare D1 Free currently includes 10 databases, 5 GB total storage, 5 million rows read per day, and 100,000 rows written per day. Limits are account-wide.
- Workers Free currently includes 100,000 requests per day and 10 ms CPU per invocation.
- Monitor usage. If limits are inadequate, stop and present alternatives/cost before upgrading.
- R2 is not configured in this branch. Check account eligibility and free-tier usage before enabling private uploads.

## Rollback
Keep the previous known-good Worker version. Version schema changes. Use documented D1 backup/recovery before risky production work. Do not delete legacy Workers, databases, or DNS records during the rebuild.
