# FRYZAR project state

**Verified:** 2 November 2026  
**Default branch:** `main` at `bac292b3e99d505f69be01e62c2b3f7621708a5f`  
**Development branch:** `foundation/fresh-build`; main was integrated by merge commit `c82152df7675b926ffdf9c53970c5d557a5da3c8`.  
**Candidate PR:** #1 open, draft, unmerged. After reconciliation GitHub reported it mergeable; do not merge automatically.  
**Recovery PR:** #3 open and draft; archival snapshots remain separate and intact.

## Candidate and preview state

The candidate contains a central API, React storefront/admin, four D1 migrations, CI tests, Worker routing configs, and bilingual UI source. Preview components are deployed and smoke-tested from candidate `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`:

- `fryzar-api-preview` -> D1 `fryzar-preview` (UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`).
- `fryzar-app-preview` and `fryzar-admin-preview` -> service binding `fryzar-api-preview`.
- Migrations 0001–0004 are recorded; schema has 22 application tables.
- Store remains setup/not-ready, checkout closed, manual transfer disabled.
- Preview secrets `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN` are configured by the workflow. No owner account has been bootstrapped.

The preview deployment workflow remains pinned to the reviewed candidate `84fefde`. The reconciliation and documentation commits did not redeploy or change application code.

## Production separation

Read-only Cloudflare inspection confirms:

- `fryzar-api` binds to `fryzar-core` (UUID `098238a6-1bda-4735-8f21-d925c7fe32de`).
- Legacy `fryzar-app` and `fryzar-admin` bind to `fryzar-production` (UUID `880b9681-4252-4db0-be44-b60c4edbdc15`).
- The legacy frontend/admin schema differs from the candidate API schema.

No production Worker, database, binding, secret, DNS, route, or data was changed.

## Latest baseline

CI run [41468365672](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41468365672) passed on the reconciliation merge commit: `npm install --ignore-scripts --no-audit --no-fund`, API typecheck, 82 API tests, 6 routing tests, local D1 checkout integration (concurrency/idempotency/rollback), storefront/admin builds, and three Wrangler preview dry-runs. It did not deploy.

No `package-lock.json` exists; dependency resolution is not locked and `npm ci` has not been verified. No dependency versions changed. Lint is not configured.

## Outstanding

- Generate and commit a lockfile through an approved, controlled process; then switch CI/deployment to `npm ci` and rerun checks.
- Keep PR #1 draft until reviewed. PR #3 stays archival.
- Owner bootstrap has not been exercised; no genuine catalogue, delivery or support data exists.
- Browser E2E, preview D1 backup/restore, remote concurrency/rollback, payment-proof storage/review, and production cutover remain open.
- Review the archived legacy Worker wildcard CORS finding before any production transition; no legacy Worker was changed.

**Next phase:** finish dependency locking and rerun the complete candidate CI before any deployment pin change.
