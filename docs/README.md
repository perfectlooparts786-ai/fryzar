# FRYZAR

Bilingual Urdu/English single-store food-ordering platform for Pakistan, with PKR pricing, built on Cloudflare Workers and D1.

## Project control

- Private GitHub repository: `perfectlooparts786-ai/fryzar`.
- GitHub is the canonical source for code, migrations, tests, documentation, issues, CI and release records.
- Cloudflare is the runtime/infrastructure platform for Workers, D1 and DNS.
- Do not create a duplicate Firebase, Supabase or other backend.
- Production changes require reviewed commits and the approval gates documented in the master development prompt.

## Current verified repository state — 1 November 2026

The root of `main` contains this README and `FRYZAR_Documentation_Pack_v2.0.zip`. The pack contains the v2.0 PRD, development prompt and README.

The repository also has three active workstreams:

| Branch | Purpose | Pull request |
|---|---|---|
| `foundation/fresh-build` | Candidate API, customer React app, admin React app, migrations, tests and CI | [Draft PR #1](https://github.com/perfectlooparts786-ai/fryzar/pull/1) |
| `audit/2026-11-01-cloudflare-baseline` | Infrastructure, schema, security and status records | [PR #2](https://github.com/perfectlooparts786-ai/fryzar/pull/2) |
| `recovery/cloudflare-worker-source-2026-11-01` | Exact deployed Worker snapshots and provenance manifest | [Draft PR #3](https://github.com/perfectlooparts786-ai/fryzar/pull/3) |

The candidate source has passed GitHub CI for API type validation/tests and customer/admin builds. It has not been deployed as the production application. The recovered Worker snapshots are archival source, not the candidate architecture.

## Current Cloudflare baseline

| Worker | D1 binding | Active version |
|---|---|---|
| `fryzar-app` | `fryzar-production` | `91fdf9ab-ae00-4928-b5be-a1a356cc0f19` |
| `fryzar-admin` | `fryzar-production` | `80b357d6-e6ea-49a7-a6bb-0802f7b88084` |
| `fryzar-api` | `fryzar-core` | `c0f0ecf8-97ef-4768-a947-f3f56be0df8e` |

The API remains configured with `APP_ENV=development` and localhost-only allowed origins. The customer Worker uses wildcard CORS. The zone `fryzar.com` is active, but no Fryzar Worker route or Worker custom domain is currently recorded.

## Database and release safeguards

- `fryzar-production` contains the observed catalogue: 4 products, 3 categories and 215 tracked stock units.
- `fryzar-core` contains the newer schema and four migration records, but no products/categories/orders/payments/staff rows.
- The schemas materially differ. No canonical D1 has been approved.
- Backup exports and local SQLite replay are recorded in the backup manifest; D1-managed restore verification remains outstanding.
- Both stores remain in setup/not-ready state. Manual transfer is disabled. Do not enable ordering or payments.

## Current release blockers

Tracked in GitHub:

- [#4 Checkout, payment and stock integrity](https://github.com/perfectlooparts786-ai/fryzar/issues/4)
- [#5 Admin permissions, login throttling and cancellation](https://github.com/perfectlooparts786-ai/fryzar/issues/5)
- [#6 Central API architecture transition](https://github.com/perfectlooparts786-ai/fryzar/issues/6)
- [#7 D1 reconciliation and restore verification](https://github.com/perfectlooparts786-ai/fryzar/issues/7)
- [#8 CORS, production environment and public routing](https://github.com/perfectlooparts786-ai/fryzar/issues/8)

The recovered legacy runtime has known release blockers around stock concurrency, payment-row creation, idempotency, cancellation restock, admin read scopes and login throttling. See `docs/audits/LEGACY_RUNTIME_FINDINGS_2026-11-01.md`.

## Canonical audit records

- `docs/PROJECT_STATUS.md`
- `docs/DECISIONS.md`
- `docs/audits/CLOUDFLARE_BASELINE_2026-11-01.md`
- `docs/audits/FOUNDATION_BRANCH_REVIEW_2026-11-01.md`
- `docs/audits/DEPLOYED_VS_FOUNDATION_2026-11-01.md`
- `docs/audits/LEGACY_RUNTIME_FINDINGS_2026-11-01.md`
- `docs/audits/D1_SCHEMA_DIFF_2026-11-01.md`
- `docs/audits/UPLOADED_DOCUMENT_PACK_REVIEW_2026-11-01.md`

## Release rule

A feature is complete only when source, automated tests, deployment and observable runtime behavior agree. Do not change live Worker bindings, D1 data/schema, secrets, DNS, payment settings or launch readiness without the relevant review and owner approval.