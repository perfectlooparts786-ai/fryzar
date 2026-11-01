# Cloudflare baseline audit — 1 November 2026

## Scope and evidence

Read-only inventory of the connected Cloudflare account and private repository `perfectlooparts786-ai/fryzar`. No Worker, DNS, or database configuration was changed. Secret values and customer records were not queried or recorded.

Repository head observed: `de248fd43d36ab25437cfee9418d06d7f268a73e` on `main`. The root currently contains `README.md` and `FRYZAR_Documentation_Pack_v2.0.zip` (80,318 bytes); the ZIP contains the v2.0 PRD and development prompt as DOCX/Markdown plus README Markdown. The README describes a docs-only state. The recent history includes upload/deletion of PRD files; the newest commit is a signed GitHub upload commit.

Cloudflare account/zone inventory matched exact resource names. Account also contains unrelated Workers and databases; they are excluded below.

## Worker runtime

All three Workers exist, use standard usage model, have no compatibility flags, and expose a workers.dev subdomain (subdomain enabled; previews disabled). Latest deployment is serving 100% of traffic for each Worker.

| Worker | Latest deployment / version | Compatibility date | D1 binding | Other bindings |
| --- | --- | --- | --- | --- |
| fryzar-app | 5d0bd0ca-ac43-4e05-90cc-80b3a47c2369 / 91fdf9ab-ae00-4928-b5be-a1a356cc0f19 | 2026-10-31 | DB → fryzar-production | none observed |
| fryzar-admin | 584319a5-154d-4b82-80f4-f8ec0da520e5 / 80b357d6-e6ea-49a7-a6bb-0802f7b88084 | 2026-10-31 | DB → fryzar-production | ADMIN_BOOTSTRAP_TOKEN (secret_text); SESSION_SECRET (secret_text) |
| fryzar-api | 9faa976e-e399-46c3-9cd6-e01190d101e7 / c0f0ecf8-97ef-4768-a947-f3f56be0df8e | 2026-11-01 | DB → fryzar-core | TRACKING_SECRET (secret_text); APP_ENV and ALLOWED_ORIGINS (plain text) |

API environment was observed as `APP_ENV=development` and `ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`. This is not production-ready. Secret values were not fetched. Latest deployment references are Cloudflare IDs and are not tied to a Git commit in the repository.

The Cloudflare Execute connector accepted the Worker script download request but returned no script body (`result` was undefined). Exact deployed source and imports therefore remain unrecovered through the currently exposed connector. No reconstruction was committed.

## D1 schema and non-sensitive data comparison

| Database | UUID | Size reported | Tables (excluding internal tables) | Products | Categories | Orders | Payment rows | Staff |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| fryzar-production | 880b9681-4252-4db0-be44-b60c4edbdc15 | 196,608 bytes | 16 | 4 | 3 | 0 | payment_records: 0 | 0 |
| fryzar-core | 098238a6-1bda-4735-8f21-d925c7fe32de | 339,968 bytes | 23 | 0 | 0 | 0 | payments: 0 | 0 |

Counts are read-only snapshots. Payment table names differ: `payment_records` exists in production; `payments` exists in core. No payment or customer contents were read.

Core records migrations `0001_core.sql`, `0002_checkout_integrity.sql`, `0003_admin_bootstrap.sql`, and `0004_inventory_adjustments.sql`. Production has no `d1_migrations` table. Other material differences include:
- `order_status_history` (production) vs `order_status_events` (core).
- Production has `inventory_movements`; core adds stricter movement semantics and `inventory_adjustments`.
- Core adds `api_rate_limits`, `auth_login_attempts`, `bootstrap_claims`, `staff_sessions`, and `product_images`.
- Core uses `store_settings.setting_key/value_json/is_public`; production uses `store_settings.key/value`.
- Product/category and payment proof columns/constraints differ; core adds delivery-zone codes, order zone references, bilingual order item snapshots, and stricter constraints.

This is a schema comparison, not a migration plan. Production contains the only observed catalogue data. Core is not yet a safe canonical target.

## Zone and routing

Zone `fryzar.com` is active. DNS inventory contains one TXT record at the apex. No Worker routes were returned for the zone. Worker subdomains are enabled, which does not prove public app health. No external HTTP smoke test was performed.

## Backup and source recovery status

No D1 export was started. Cloudflare's export endpoint documentation says an export can make the database unavailable to queries while running. This audit therefore leaves the live database available and requests an owner-approved maintenance window before attempting this operation. No backup/restore evidence exists yet.

No source, config, or secrets were changed. A safe recovery requires a connector/API path that returns the original multipart Worker script and modules, followed by secret scanning and provenance capture. Do not replace the Workers with inferred code.

## Risks and next actions

1. **High — split databases:** customer/admin use fryzar-production; API uses fryzar-core. Do not rebind or migrate until verified backups, full schema/data reconciliation, test restore, and rollback evidence exist.
2. **High — API environment:** development APP_ENV and localhost origins are configured on the current API Worker. Do not call this deployment production-ready.
3. **High — source provenance:** deployed source is absent from GitHub and the current tool response does not expose the Worker download body.
4. **High — backups:** no verified backup/restore exists; export may interrupt service.
5. **Launch blocker — routing:** no fryzar.com Worker routes or app DNS targets were observed.
6. **Data authority:** fryzar-production has 4 products and 3 categories; fryzar-core is empty for those tables. Neither DB should be chosen as canonical without a complete comparison and owner sign-off.

Next exact task: obtain a source-download connector path that returns multipart Worker modules; preserve exact modules and deployment IDs on a recovery branch, with secret scan results. Separately schedule and execute a backed-up, restore-verified D1 export window before considering database changes.
