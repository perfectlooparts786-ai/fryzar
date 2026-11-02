# FRYZAR isolated preview environment

Updated: 2 November 2026

## Purpose

This environment validates the candidate central API architecture without routing to or modifying the existing production Workers or either production D1 database.

## Isolated resources

| Resource | Preview name | Purpose |
|---|---|---|
| API Worker | `fryzar-api-preview` | Candidate business API |
| Customer Worker | `fryzar-app-preview` | Customer React assets and API proxy |
| Admin Worker | `fryzar-admin-preview` | Admin React assets and API proxy |
| D1 | `fryzar-preview` | Candidate schema and preview-only data |

D1 UUID: `a6f528a3-4b36-43a9-8e77-31f7105a4aeb` (APAC; read replication disabled).

The preview API's `DB` binding points to this UUID. Customer and admin Workers use an `API` service binding to `fryzar-api-preview`. None of these preview Workers bind to a production database.

The existing production topology is different:
- `fryzar-api` binds to `fryzar-core` (UUID `098238a6-1bda-4735-8f21-d925c7fe32de`).
- Legacy `fryzar-app` and `fryzar-admin` bind to `fryzar-production` (UUID `880b9681-4252-4db0-be44-b60c4edbdc15`).
- The legacy frontend/admin schema differs from the candidate API schema. Do not assume these databases are interchangeable.

## D1 schema and migration state

Read-only Cloudflare inspection on 2 November 2026 verified these four GitHub migrations are applied to `fryzar-preview` in order:

| Migration | GitHub blob SHA |
|---|---|
| `0001_core.sql` | `a9a60a510dea636d85ce6ece43b7abb116dda181` |
| `0002_checkout_integrity.sql` | `f0b6430d20a5ca86ada04abb7d27a11a94876f8a` |
| `0003_admin_bootstrap.sql` | `a0e13133f291eec91ea4f9a4234e393dff48cace` |
| `0004_inventory_adjustments.sql` | `3f4c11faf33417e2fc5e0a1b5126cb6bc1ba0ccc` |

The schema contains 22 application tables, including orders, payments, products, staff, inventory, audit and support tables. Preview smoke checks confirmed empty product/category responses and setup settings; no customer-facing catalog data was seeded.

Default settings verified through preview HTTP smoke tests:
- `store_status = setup`
- `launch_ready = false`
- `manual_transfer_enabled = false`
- `currency = PKR`

## Live deployment verification

GitHub Actions run [41383813602](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41383813602) completed successfully on 2 November 2026. It deployed the reviewed candidate commit `84fefded8640cb3abd23cd2df6fdbb811cf9d19d` to all three preview Workers.

Verified hosts:
- API: https://fryzar-api-preview.perfectlooparts786.workers.dev
- Customer: https://fryzar-app-preview.perfectlooparts786.workers.dev
- Admin: https://fryzar-admin-preview.perfectlooparts786.workers.dev

The workflow smoke tests passed for:
- Direct API health and D1 schema readiness.
- Customer/admin API forwarding and exact-origin CORS.
- Empty catalogue and categories.
- Setup/readiness/payment settings and closed checkout.
- Unauthenticated admin session before owner bootstrap.
- Customer and admin React application shells.

Cloudflare read-back confirmed the Worker names, D1/service bindings, and successful deployments. No public custom domain, DNS record, production route, production Worker, or production D1 was changed.

## Deployment workflow and credentials

The manual workflow on `main` is `.github/workflows/deploy-preview.yml`. It checks out a pinned reviewed candidate commit, verifies the Cloudflare account ID and required preview secrets without printing their values, checks explicit preview Worker/database names and IDs, runs tests/builds, applies migrations to `fryzar-preview`, provisions preview-only API secrets, deploys the three preview Workers, then runs HTTP smoke tests.

The successful deployment verified these GitHub Actions environment secret references were present and met the workflow's validation: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `TRACKING_SECRET`, and `OWNER_BOOTSTRAP_TOKEN`. Secret values were not retrieved, displayed, or copied into repository files. Preview Workers expose only secret names in Cloudflare configuration read-back.

The foundation branch's workflow was aligned with the pinned workflow from `main` in commit `068c5c989c820823330192977a28aa31168811f2`. CI for that workflow-only commit was running when this document was updated. The manual workflow's candidate SHA must be advanced only after a replacement commit passes CI and is reviewed.

## Operational safety

- Deploy only with the pinned candidate workflow and explicit preview targets.
- Never point preview configs at `fryzar-app`, `fryzar-admin`, `fryzar-api`, `fryzar-production`, or `fryzar-core`.
- Keep preview checkout closed until catalog data, delivery settings, support details and release checks are complete.
- Do not bootstrap an owner account or insert real business data as part of routine deployment.
- A successful deployment is not sufficient by itself; retain HTTP smoke tests and database binding checks.
- If preview checks fail, fix the candidate and rerun CI/preview. Do not alter production to make preview pass.

## Current status

Preview Workers and migrations are deployed and HTTP smoke-tested. The store remains in setup mode, checkout is closed, manual transfer is disabled, and no owner account or real catalog data has been added. PR #1 remains a draft and GitHub reports a dirty merge state against `main`; reconcile and review it before any merge. Production cutover is outside this phase.
