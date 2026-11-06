# FRYZAR Documentation Index

Bilingual Urdu/English single-store food-ordering, editorial, and operations platform for Pakistan (PKR integer paisa arithmetic), built on **Cloudflare Workers Free + D1 Free ($0/month)**.

## Canonical Governance

- **Repository:** `perfectlooparts786-ai/fryzar`
- **Active Release Candidate Branch:** `feature/fryzar-master-transformation` (built atop `foundation/fresh-build`)
- **Primary Domain:** `fryzar.com`
- **Production Safety Rule:** Never mutate `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`), `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`), production Workers (`fryzar-api`, `fryzar-app`, `fryzar-admin`), production secrets, or `fryzar.com` DNS without explicit Owner cutover authorization.

## Verified Platform State — 7 November 2026

| Subsystem | Status | Verification Evidence |
|---|---|---|
| **Central API (`apps/api`)** | Complete (`0001`–`0009` schema, 46 tables, 39 indexes) | 101 API unit tests + 11 local Wrangler D1 integration suites PASS |
| **Customer Storefront (`apps/storefront`)** | Complete (17 pages, EN LTR + UR RTL, SEO/JSON-LD, variants/modifiers/coupons/COD/tracking) | Production Vite build + Playwright mobile/desktop E2E PASS |
| **Owner Control Center (`apps/admin`)** | Complete (27 functional modules, zero placeholders, printable receipts, RBAC, audit trail) | Production Vite build + Playwright 27-module & kill-switch E2E PASS |
| **Adsterra Monetization (`apps/storefront/src/ads/`)** | Complete (12 modular files, disabled by default, 100% zero ads on transactional/policy routes) | Unit + Playwright restricted-route safety tests PASS |
| **Preview Environment (`*-preview`)** | Migrated (`0001`–`0009`) & Deployed | `fryzar-api-preview` (`2760e1e3`), `fryzar-app-preview` (`9466e07b`), `fryzar-admin-preview` (`b7a247d2`) HTTP 200 OK |
| **Production Environment** | **100% Untouched & Protected** | 3 categories, 4 products, 215 stock units preserved; lossless migration script verified |

## Complete Documentation Directory (17 Core Documents)

1. [ARCHITECTURE.md](ARCHITECTURE.md) — Central Worker/D1 topology, 17-page storefront, 27-module admin, and complete API inventory.
2. [MIGRATIONS.md](MIGRATIONS.md) — Ordered D1 schema catalog (`0001_core.sql` through `0009_platform_completion.sql`).
3. [DATABASE_RECONCILIATION.md](DATABASE_RECONCILIATION.md) — Reconciliation across `fryzar-production`, `fryzar-core`, and `fryzar-preview` + lossless 215-unit stock preservation.
4. [CLOUDFLARE_RESOURCE_MAP.md](CLOUDFLARE_RESOURCE_MAP.md) — Exact Worker versions, D1 UUIDs, bindings, URLs, and Free-tier quota guardrails.
5. [DEPLOYMENT.md](DEPLOYMENT.md) — Preview deployment verification (`2760e1e3`, `9466e07b`, `b7a247d2`) and workflow controls.
6. [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md) — Phased, zero-data-loss production cutover runbook.
7. [PRODUCTION_ROLLBACK_PLAN.md](PRODUCTION_ROLLBACK_PLAN.md) — Instant containment switches, Worker rollback versions, and D1 recovery safeguards.
8. [D1_BACKUP_RESTORE.md](D1_BACKUP_RESTORE.md) — Local automated snapshot rehearsal and verified remote preview SQL export (`C41CB588...`).
9. [TESTING.md](TESTING.md) — Full test matrix (108 unit/routing tests, 11 D1 integration suites, 8 Playwright E2E tests).
10. [BROWSER_E2E.md](BROWSER_E2E.md) — Playwright Chromium mobile/desktop E2E coverage across storefront, SEO, ad safety, and 27 admin modules.
11. [SECURITY_REVIEW.md](SECURITY_REVIEW.md) — Auth, PBKDF2-SHA256, `__Host-` sessions, RBAC, PII redaction, CORS, rate limits, and idempotency.
12. [ADSTERRA_MONETIZATION.md](ADSTERRA_MONETIZATION.md) — Modular Adsterra architecture, 12 owner controls, and activation checklist.
13. [AD_SAFETY_POLICY.md](AD_SAFETY_POLICY.md) — Permanently blocked intrusive formats, sensitive categories, zero-PII telemetry, and kill switch.
14. [AD_PLACEMENT_MAP.md](AD_PLACEMENT_MAP.md) — Approved slots, viewport density limits, and strictly ad-free transactional/policy routes.
15. [PROJECT_STATE.md](PROJECT_STATE.md) — Current reconciled engineering state.
16. [RELEASE_READINESS.md](RELEASE_READINESS.md) — Production release candidate checklist and remaining owner-supplied business inputs.
17. [EXECUTION_LOG.md](EXECUTION_LOG.md) — Chronological engineering and verification log.
