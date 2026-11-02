# FRYZAR deployment and recovery

## Verified preview environment

The candidate implementation is deployed to three isolated Workers:

- API: `fryzar-api-preview` → D1 `fryzar-preview`, UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`.
- Customer: `fryzar-app-preview` → service binding `fryzar-api-preview` and customer static assets.
- Admin: `fryzar-admin-preview` → service binding `fryzar-api-preview` and admin static assets.

The preview D1 has repository migrations `0001_core.sql` through `0004_inventory_adjustments.sql` applied. Its candidate schema contains 22 application tables. On 2 November 2026, GitHub Actions deployment run [41383813602](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41383813602) completed deployment and HTTP smoke checks for API/D1 health, both frontend service bindings, exact CORS, app shells, setup flags and closed checkout.

Preview URLs:
- https://fryzar-api-preview.perfectlooparts786.workers.dev
- https://fryzar-app-preview.perfectlooparts786.workers.dev
- https://fryzar-admin-preview.perfectlooparts786.workers.dev

Store state remains setup, ordering remains closed, manual transfer is disabled, and the preview has no owner account or real catalog data.

## Existing production resources (read-only)

The current live topology has separate legacy schemas and remains unchanged:

- `fryzar-api` binds to `fryzar-core`, UUID `098238a6-1bda-4735-8f21-d925c7fe32de`.
- `fryzar-app` and `fryzar-admin` bind to `fryzar-production`, UUID `880b9681-4252-4db0-be44-b60c4edbdc15`.

Read-only inspection found the candidate schema and legacy frontend/admin schema differ. Do not treat the databases as interchangeable or use either as the candidate preview database. No production deployment, migration, binding, secret, DNS or route change is authorized by these instructions.

## Candidate preview workflow

The manual workflow `.github/workflows/deploy-preview.yml` on `main` checks out the reviewed candidate by commit SHA. It verifies account and preview secret presence, checks the expected preview Worker and D1 names/IDs against production identifiers, runs tests and builds, applies migrations to `fryzar-preview` only, provisions preview-only API secrets, deploys the three preview Workers, and runs live HTTP smoke tests. Preview deployment credentials are scoped to the GitHub Actions `preview` environment; secret values must never be logged, copied or committed.

The candidate commit currently pinned in the workflow is `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. Change that pin only after a replacement candidate has passed CI and review. The workflow-only hardening was aligned to the existing foundation PR in commit `068c5c989c820823330192977a28aa31168811f2`; CI was still running at the time of this documentation update.

## Local development and baseline checks

The repository uses npm and Wrangler. No npm lockfile is currently present on the candidate branch, so dependency resolution is not locked; CI uses `npm install --ignore-scripts --no-audit --no-fund`. Add and review a lockfile in a separate focused change before claiming deterministic dependency installs.

Useful commands from the repository root:

~~~bash
npm install
npm run db:migrate:local
npm run dev:api-preview
npm run dev:storefront
npm run dev:admin
npm test
npm run test:integration:local
npm run build:storefront
npm run build:admin
~~~

The latest completed candidate CI run [41318743198](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41318743198) passed 82 API tests, 6 Worker routing tests, local D1 checkout integration, storefront/admin builds and all three Wrangler preview dry-runs.

## Database change procedure

For preview-only migration work:
1. Confirm Cloudflare account and the exact `fryzar-preview` name and UUID.
2. Read the full migration and verify it is additive/compatible with applied history.
3. Confirm current `d1_migrations` rows with a read-only query.
4. Run `npm run db:migrate:preview` only from the pinned preview workflow.
5. Read back schema, migration history and safe health endpoints.

Never reset the preview or production databases. Never execute destructive SQL. Do not run production migrations.

## Recovery and rollback

Keep legacy systems unchanged while preview is evaluated. Record deployed preview versions and preserve their prior version as a rollback target before a future preview release. D1 restore/backup rehearsal is still outstanding. Do not attempt production rollback or cutover as part of preview verification.
