# FRYZAR isolated preview environment

Updated: 2 November 2026

## Preview resources

| Component | Resource | Binding |
|---|---|---|
| API | `fryzar-api-preview` | D1 `fryzar-preview`, UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb` |
| Customer | `fryzar-app-preview` | Service `fryzar-api-preview`; static assets |
| Admin | `fryzar-admin-preview` | Service `fryzar-api-preview`; static assets |

Preview D1 has migrations 0001–0004 and 22 application tables. Read-only queries confirmed the migration rows; smoke checks confirmed empty catalogue/categories and setup state. No business data was seeded.

## Verified deployment

The deployed candidate remains `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. GitHub Actions [41383813602](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41383813602) deployed all three Workers and passed API/D1 health, customer/admin forwarding, exact-origin CORS, empty catalogue, setup flags, closed checkout, unauthenticated admin and SPA shell tests.

- https://fryzar-api-preview.perfectlooparts786.workers.dev
- https://fryzar-app-preview.perfectlooparts786.workers.dev
- https://fryzar-admin-preview.perfectlooparts786.workers.dev

Preview secret bindings `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN` exist; values were never retrieved. Bootstrap has not been performed and no owner account exists.

## Workflow and branch status

The manual workflow on `main` and development branch is pinned to `84fefde`, requires environment `preview`, validates explicit preview resource IDs/names, provisions preview-only secrets, and smoke-tests the live URLs. The workflow was not run again during branch reconciliation. Do not advance its candidate pin until a replacement passes CI and code review.

Development branch reconciliation merge: `c82152df7675b926ffdf9c53970c5d557a5da3c8`. It includes main `bac292b3e99d505f69be01e62c2b3f7621708a5f`; all main commits were integrated without changing candidate application or Worker configuration. Draft PR #1 remains unmerged.

## Isolation and safety

Production remains separate: `fryzar-api` binds to `fryzar-core`; legacy `fryzar-app`/`fryzar-admin` bind to `fryzar-production`. These schemas differ. No production Worker, D1, binding, secret, DNS or route was modified.

CI run [41468365672](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468365672) passed on the reconciliation merge: 82 API tests, 6 routing tests, local D1 checkout integration, storefront/admin builds and all three Wrangler dry-runs. It used `npm install --ignore-scripts --no-audit --no-fund`; the repository still has no lockfile, so `npm ci` is not yet available. Keep checkout closed and manual transfer disabled.


## Phase 3 branch reconciliation — 3 November 2026

The current development branch has a committed root `package-lock.json` and CI uses `npm ci`. The manual preview workflow is deliberately pinned to historical commit `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`; that commit has no root lockfile, so its install command remains `npm install`. Do not update the pin or dispatch the workflow without separate review and explicit preview deployment authorization.

The development branch's new migration catalog is `docs/MIGRATIONS.md`. A local-only migration integrity/replay test has been added to CI. Neither item means remote preview D1 has received migration 0005. The last documented deployed preview candidate remains 84fefde; current branch deployment is unverified.

Production resources remain outside this development workflow. No preview deployment, remote D1 mutation, owner bootstrap, production deployment or DNS change is part of this update.
