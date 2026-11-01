# Cloudflare baseline audit — 1 November 2026

## Scope and repository state

Read-only inventory of the connected Cloudflare account and private repository `perfectlooparts786-ai/fryzar`. No Worker, DNS, or live D1 contents were changed. Secret values and customer records were not queried or recorded.

At inspection, `main` was at `de248fd43d36ab25437cfee9418d06d7f268a73e` and contained `README.md` plus `FRYZAR_Documentation_Pack_v2.0.zip`. The ZIP contains the v2.0 PRD and development prompt in DOCX/Markdown and a README.

The repo also has development branch `foundation/fresh-build` (observed head `5527ed812e9c6fb6dea85182aad768b50c686fe4`) and open draft [PR #1](https://github.com/perfectlooparts786-ai/fryzar/pull/1). Its candidate implementation includes an API, customer and admin React clients, four D1 migrations, a mocked API suite, and CI. Observed CI validates TypeScript, runs 72 mocked API tests, and builds both clients. It does not deploy Workers. This candidate branch is not proven to match the deployed Cloudflare source. See [FOUNDATION_BRANCH_REVIEW_2026-11-01.md](FOUNDATION_BRANCH_REVIEW_2026-11-01.md).

This baseline record is in audit [PR #2](https://github.com/perfectlooparts786-ai/fryzar/pull/2). Cloudflare account resources were matched by exact name; unrelated resources are excluded.

## Worker runtime

All three Workers exist, use standard usage model, have no compatibility flags, and have an enabled workers.dev subdomain with previews disabled. Latest deployment is serving 100% of traffic for each Worker.

| Worker | Latest deployment / version | Compatibility date | D1 binding | Other bindings |
| --- | --- | --- | --- | --- |
| fryzar-app | 5d0bd0ca-ac43-4e05-90cc-80b3a47c2369 / 91fdf9ab-ae00-4928-b5be-a1a356cc0f19 | 2026-10-31 | DB → fryzar-production | none observed |
| fryzar-admin | 584319a5-154d-4b82-80f4-f8ec0da520e5 / 80b357d6-e6ea-49a7-a6bb-0802f7b88084 | 2026-10-31 | DB → fryzar-production | ADMIN_BOOTSTRAP_TOKEN (secret_text); SESSION_SECRET (secret_text) |
| fryzar-api | 9faa976e-e399-46c3-9cd6-e01190d101e7 / c0f0ecf8-97ef-4768-a947-f3f56be0df8e | 2026-11-01 | DB → fryzar-core | TRACKING_SECRET (secret_text); APP_ENV and ALLOWED_ORIGINS (plain text) |

API environment was observed as `APP_ENV=development` and `ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`. This is not production-ready. Secret values were not fetched. Deployed Worker versions are not tied to Git commits in the observed inventory.

The Cloudflare Execute connector accepted the Worker script download request but returned no script body (`result` undefined). Exact deployed source and imports therefore remain unrecovered through the currently exposed connector. Do not substitute the foundation branch as recovered production source.

## D1 schemas, migrations, and non-sensitive counts

| Database | UUID | Reported size | Application tables | Products | Categories | Orders | Payment rows | Staff | Tracked stock units |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| fryzar-production | 880b9681-4252-4db0-be44-b60c4edbdc15 | 196,608 bytes | 15 | 4 | 3 | 0 | payment_records: 0 | 0 | 215 |
| fryzar-core | 098238a6-1bda-4735-8f21-d925c7fe32de | 339,968 bytes | 22 | 0 | 0 | 0 | payments: 0 | 0 | 0 |

Application table counts exclude SQLite internals and Cloudflare internal tables. Payment model names differ: `payment_records` exists in production; `payments` exists in core. No payment or customer rows were read.

Core records migrations `0001_core.sql`, `0002_checkout_integrity.sql`, `0003_admin_bootstrap.sql`, and `0004_inventory_adjustments.sql`. Production has no `d1_migrations` table. Other material differences include:
- `order_status_history` (production) vs `order_status_events` (core).
- Production has `inventory_movements`; core adds stricter movement semantics and `inventory_adjustments`.
- Core adds `api_rate_limits`, `auth_login_attempts`, `bootstrap_claims`, `staff_sessions`, and `product_images`.
- Core uses `store_settings.setting_key/value_json/is_public`; production uses `store_settings.key/value`.
- Product/category and payment-proof columns and constraints differ; core adds delivery-zone codes, order-zone references, bilingual order-item snapshots, and stricter constraints.

The schema comparison is not a migration plan. Production holds the only observed catalogue and tracked stock. Core is not yet a safe canonical target.

## Backups and restore verification

Both D1 exports completed during the owner-approved window. SQL files are stored locally in an ACL-restricted folder; raw backups are not committed to GitHub. Each dump was replayed in an isolated in-memory SQLite database without SQL errors. Restored row counts matched the read-only inventory. A read-only `SELECT 1` probe then succeeded against each live database.

This verifies SQL replay with local SQLite, not a Cloudflare D1 managed-restore drill. Backup sizes, SHA-256 hashes, and exact restore scope are in [D1_BACKUP_MANIFEST_2026-11-01.md](D1_BACKUP_MANIFEST_2026-11-01.md).

## Zone and routing

Zone `fryzar.com` is active. DNS inventory contains one apex TXT record. No Worker routes were returned for the zone. Worker subdomains are enabled, which does not prove public app health. No external HTTP smoke test was performed.

## Risks and next actions

1. **High — split databases:** customer/admin use fryzar-production; API uses fryzar-core. Do not rebind or migrate until data/schema reconciliation, D1-specific rollback evidence, and owner sign-off.
2. **High — API environment:** development APP_ENV and localhost origins remain configured on the current API Worker.
3. **High — source provenance:** exact deployed modules remain unrecovered; foundation branch code is a candidate implementation, not proof of deployed source.
4. **Launch blocker — routing:** no fryzar.com Worker routes or app DNS targets were observed.
5. **Runtime verification:** green mocked CI does not establish real D1 behavior, live Worker behavior, browser E2E, or domain health.

Next exact task: obtain a source-download path returning original Worker modules, then compare each deployed Worker to the foundation branch while preserving version and deployment provenance. Do not deploy or switch database bindings as part of source recovery.
