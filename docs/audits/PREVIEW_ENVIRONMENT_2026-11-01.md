# Preview environment baseline — 1 November 2026

## Purpose

Provide a completely isolated place to validate the candidate central API and its customer/admin clients without changing either current Fryzar database or the three live legacy Workers.

## Preview D1

Created through Cloudflare D1 API after confirming exact-name availability:

- Name: `fryzar-preview`
- UUID: `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`
- Created: 2026-11-01 07:43 UTC
- Primary location: APAC
- Read replication: disabled
- Initially empty; no imported production/customer data.

Fetched the four migration files from GitHub branch `foundation/fresh-build`, verified their repository blob SHAs, and applied each SQL file to this new database with its `d1_migrations` ledger entry.

| Migration | GitHub blob SHA | Result |
|---|---|---|
| `0001_core.sql` | `a9a60a510dea636d85ce6ece43b7abb116dda181` | Applied |
| `0002_checkout_integrity.sql` | `f0b6430d20a5ca86ada04abb7d27a11a94876f8a` | Applied |
| `0003_admin_bootstrap.sql` | `a0e13133f291eec91ea4f9a4234e393dff48cace` | Applied |
| `0004_inventory_adjustments.sql` | `3f4c11faf33417e2fc5e0a1b5126cb6bc1ba0ccc` | Applied |

### Read-back verification

- 22 application tables found.
- 19 application indexes and the two expected triggers found.
- Four `d1_migrations` rows, ordered 0001 through 0004.
- Counts are zero for products, categories, orders, payments, staff users, inventory movements, delivery zones and inventory adjustments.
- No negative stock products.
- Default settings: store `setup`, launch readiness false, manual transfer false, COD true, PKR, delivery fee zero, minimum order zero.

Normal read-only queries succeeded. Attempts to run `PRAGMA foreign_key_check` and `PRAGMA integrity_check` through this Cloudflare D1 query API returned `SQLITE_AUTH`; these checks are therefore not recorded as passed. Use supported query/constraint tests in the next validation batch.

## Candidate preview Worker topology

The implementation is proposed in [PR #9](https://github.com/perfectlooparts786-ai/fryzar/pull/9), based on `foundation/fresh-build`.

| Preview Worker | Responsibilities | D1 binding / service |
|---|---|---|
| `fryzar-api-preview` | Central API, checkout, tracking and admin routes | D1 `fryzar-preview` |
| `fryzar-app-preview` | Customer React SPA static assets | service binding `API` → `fryzar-api-preview` |
| `fryzar-admin-preview` | Admin React SPA static assets | service binding `API` → `fryzar-api-preview` |

Customer/admin entrypoints forward `/api` and `/api/*` requests unchanged through the service binding; other paths are served via Workers Static Assets. The Wrangler configs use SPA fallback and send API paths to the Worker first.

The preview API origin allowlist includes the local Vite ports and the expected preview customer/admin workers.dev origins. No custom domain is attached.

## GitHub code and automation

PR #9 includes:
- API preview Wrangler config bound to the new D1.
- Customer and admin Worker entrypoints and Wrangler configs.
- Explicit preview-only npm scripts; ambiguous generic API deployment aliases removed.
- Mock Worker routing tests.
- CI API/type tests, web builds and Wrangler dry-runs for all three preview configs.
- Manual-only `.github/workflows/deploy-preview.yml`.
- `docs/operations/PREVIEW_ENVIRONMENT.md` with deploy sequence, security rules and limitations.

CI run [41286160460](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41286160460) succeeded on commit `db32b8d3b185e73b025e144cec9b9be2ad94f59b`. It passed API validation/tests, Worker routing tests, both web builds, and dry-run validation for all three Wrangler configs. The branch then received a documentation-only status link commit `776cc2e93a61b0bd15989dcb2853b498f9b2405c`; its fresh run was in progress at the time of this audit update.

Issue [#10](https://github.com/perfectlooparts786-ai/fryzar/issues/10) tracks the remaining preview deployment credentials and live smoke-test gate.

## Deployment status

No preview Worker is deployed yet.

To deploy, configure GitHub Actions environment `preview` with `CLOUDFLARE_ACCOUNT_ID` and a narrowly scoped `CLOUDFLARE_API_TOKEN`, then manually dispatch the preview workflow after PR #9 is merged to the development branch. These GitHub Actions credentials are not readable through the connected GitHub tools and their availability has not been confirmed.

The candidate API will also need preview-specific Worker secrets `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN` before private tracking, checkout, and owner setup can be fully tested. Do not reuse production secret values.

## Production and data safety

The following remain unchanged:
- Existing Worker `fryzar-app`, `fryzar-admin`, `fryzar-api` source/version/deployment and bindings.
- Existing D1 `fryzar-production` and `fryzar-core` schemas, records and bindings.
- Existing secret bindings/values.
- `fryzar.com` DNS, Worker routes and custom domains.
- Payment provider settings and store launch flags.

No production store was opened, no manual-transfer payment method was enabled, and no production migration or cutover was attempted. The separate preview DB contains only candidate schema/settings and no real store/customer data.
