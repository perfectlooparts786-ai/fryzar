# Fryzar isolated preview environment

Updated: 1 November 2026

## Purpose

This environment is for validating the candidate central-API architecture without routing or modifying the currently deployed Fryzar Workers or the existing production/core D1 databases.

## Isolated resources

| Resource | Preview name | Purpose |
|---|---|---|
| API Worker | `fryzar-api-preview` | Candidate business API |
| Customer Worker | `fryzar-app-preview` | Customer React static assets and API proxy |
| Admin Worker | `fryzar-admin-preview` | Admin React static assets and API proxy |
| D1 | `fryzar-preview` | Empty database with candidate GitHub migrations |

D1 database UUID: `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`  
Created in: APAC  
Read replication: disabled

The preview D1 is separate from both existing databases:
- `fryzar-production` remains bound to the active legacy customer/admin Workers.
- `fryzar-core` remains bound to the active legacy API Worker.
- No preview Worker is bound to either existing database.

## D1 baseline and migration evidence

The following source migrations were fetched from GitHub branch `foundation/fresh-build` and applied to the new empty preview D1 in order:

| Migration | GitHub blob SHA |
|---|---|
| `0001_core.sql` | `a9a60a510dea636d85ce6ece43b7abb116dda181` |
| `0002_checkout_integrity.sql` | `f0b6430d20a5ca86ada04abb7d27a11a94876f8a` |
| `0003_admin_bootstrap.sql` | `a0e13133f291eec91ea4f9a4234e393dff48cace` |
| `0004_inventory_adjustments.sql` | `3f4c11faf33417e2fc5e0a1b5126cb6bc1ba0ccc` |

Cloudflare read-back verifies 22 application tables and four matching rows in `d1_migrations`. The following business tables are empty: products, categories, orders, payments, staff_users, inventory_movements, delivery_zones and inventory_adjustments.

Default settings read back from preview D1:
- `store_status = "setup"`
- `launch_ready = false`
- `manual_transfer_enabled = false`
- `cod_enabled = true`
- `currency = "PKR"`
- `delivery_fee_paisa = 0`

No demo products, categories, customers, staff or orders were inserted. Store opening and manual transfer remain disabled.

## Worker wiring

The customer and admin Worker entrypoints forward all `/api` and `/api/*` requests using a Cloudflare Service Binding named `API` to `fryzar-api-preview`. All non-API paths are served by each Worker's static asset binding.

Both front-end Workers use Workers Static Assets with SPA fallback. The Wrangler configs explicitly send `/api/*` to the Worker first and route other requests to static assets.

Expected workers.dev hostnames (not yet verified by HTTP smoke test):
- `https://fryzar-api-preview.perfectlooparts786.workers.dev`
- `https://fryzar-app-preview.perfectlooparts786.workers.dev`
- `https://fryzar-admin-preview.perfectlooparts786.workers.dev`

No custom domain, DNS record, route, or production hostname is changed by this preview setup.

## Deployment order

The optional manual GitHub Actions workflow `.github/workflows/deploy-preview.yml` deploys only the preview names:
1. Validate API tests, Worker routing tests and both web builds.
2. Apply migrations to `fryzar-preview` only.
3. Deploy `fryzar-api-preview`.
4. Deploy `fryzar-app-preview`.
5. Deploy `fryzar-admin-preview`.

The workflow requires GitHub Actions environment `preview` to contain:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Only a narrowly scoped Cloudflare API token should be stored there. Do not add token values to GitHub files, workflow YAML, logs or prompts. The presence/availability of these environment secrets has not been verified by this audit.

The candidate API also expects preview Worker secret bindings for `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN` before private tracking, checkout, or owner bootstrap can be tested. Do not reuse production secret values. Provision preview-only credentials through an approved secure path before those tests. Until then, keep store setup flags closed.

## Operational safety

- Never deploy these configs against names `fryzar-app`, `fryzar-admin`, or `fryzar-api`.
- Never change `fryzar-production` or `fryzar-core` bindings from this workflow.
- Never add a production route, custom domain or payment provider from this preview workflow.
- Keep the preview store setup/not-ready and manual transfer disabled.
- A successful Wrangler upload does not prove application health. Verify live health, public catalogue empty states, admin auth, route forwarding, API responses, browser flows and D1 state after deployment.
- If preview checks fail, keep production unchanged; fix the feature branch and rerun CI/preview.

## Current deployment status

This document records preview resource creation, migration and source configuration. The three preview Workers have **not yet been deployed** by this branch. Deployment is a separate step requiring verified GitHub Actions preview credentials and a successful run of the manual preview workflow.
