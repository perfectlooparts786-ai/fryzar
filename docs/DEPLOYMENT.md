# FRYZAR deployment and recovery

## Verified preview deployment

The candidate is deployed to:

- API: `fryzar-api-preview` -> D1 `fryzar-preview`, UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`.
- Customer: `fryzar-app-preview` -> service binding `fryzar-api-preview`.
- Admin: `fryzar-admin-preview` -> service binding `fryzar-api-preview`.

The deployed candidate is `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. Deployment run [41383813602](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41383813602) passed HTTP checks for direct API/D1 health, service forwarding, exact CORS, empty catalogue/categories, setup flags, closed checkout, unauthenticated admin, and both frontend shells.

- https://fryzar-api-preview.perfectlooparts786.workers.dev
- https://fryzar-app-preview.perfectlooparts786.workers.dev
- https://fryzar-admin-preview.perfectlooparts786.workers.dev

Migrations 0001–0004 are applied to preview D1. It has 22 application tables. Store status remains setup; checkout and manual transfer are disabled; no owner account or genuine business data has been added.

## Existing production resources

Read-only inspection found `fryzar-api` uses `fryzar-core`; legacy `fryzar-app` and `fryzar-admin` use `fryzar-production`. Their schemas differ. No production Worker, D1, binding, secret, DNS record, route, or data was changed.

## Preview workflow

`.github/workflows/deploy-preview.yml` is on `main` and the development branch. It is manual, requires GitHub environment `preview`, checks out reviewed candidate SHA `84fefde`, validates preview account/secrets/resource names/IDs, applies only preview migrations, provisions preview secrets, deploys the three preview Workers, and runs HTTP smoke tests. The candidate workflow was confirmed identical to main's pinned workflow.

Do not advance the pin until a replacement candidate has passed CI and review. Do not deploy from an unreviewed branch.

## Dependency and CI state

The candidate branch has no `package-lock.json`; no dependencies were changed. CI still uses `npm install --ignore-scripts --no-audit --no-fund`. Do not switch CI or deployment to `npm ci` until a compatible lockfile exists and `npm ci` has passed.

After reconciling main, run [CI 41468365672](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468365672) passed on merge commit `c82152d`: npm install, typecheck, 82 API tests, 6 Worker-routing tests, local D1 checkout integration, both frontend builds, and three Wrangler dry-runs. This run did not deploy. Lint is not configured.

## Recovery

Never reset databases or execute destructive SQL. Keep production unchanged. Preview restore/backup rehearsal, remote D1 concurrency/rollback tests, browser E2E, and production cutover planning remain outstanding.
