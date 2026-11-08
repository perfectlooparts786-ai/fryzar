# FRYZAR Documentation Index

Bilingual Urdu/English single-store food-ordering, editorial, and operations platform for Pakistan (PKR integer paisa arithmetic), built on **Cloudflare Workers Free + D1 Free ($0/month)**.

## Canonical Governance

- **Repository:** `perfectlooparts786-ai/fryzar`
- **Accepted Release Candidate Branch:** `feature/fryzar-preview-acceptance` (built atop `feature/fryzar-master-transformation` / `foundation/fresh-build`)
- **Primary Domain:** `fryzar.com`
- **Production Safety Rule:** Never mutate `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`), `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`), production Workers (`fryzar-api`, `fryzar-app`, `fryzar-admin`), production secrets, or `fryzar.com` DNS without explicit Owner cutover authorization.

## Verified Platform State — 7 November 2026

| Subsystem | Status | Verification Evidence |
|---|---|---|
| **Central API (`apps/api`)** | Complete & Hardened (`0001`–`0009` schema, 46 tables, 39 indexes) | 107 API unit tests + 11 local Wrangler D1 integration suites PASS |
| **Customer Storefront (`apps/storefront`)** | Complete (17 pages, EN LTR + UR RTL, SEO/JSON-LD, variants/modifiers/coupons/COD/tracking) | Production Vite build + 11 Playwright mobile/tablet/desktop E2E PASS |
| **Owner Control Center (`apps/admin`)** | Complete (27 functional modules, role-scoped NAV, Owner Setup Readiness Checklist, RBAC) | Production Vite build + Playwright 27-module, Rider & kill-switch E2E PASS |
| **Adsterra Monetization (`apps/storefront/src/ads/`)** | Complete (12 modular files, disabled by default, `$0.00` verified, 100% zero ads on restricted routes) | Reconciled API contract + Playwright restricted-route & alias safety tests PASS |
| **Preview Environment (`*-preview`)** | Migrated (`0001`–`0009`), Deployed & Accepted | `fryzar-api-preview` (`b811d6af`), `fryzar-app-preview` (`16bc6c30`), `fryzar-admin-preview` (`40f93681`) HTTP 200 OK + `_headers` |
| **Production Environment** | **100% Untouched & Protected** | 3 categories, 4 products, 215 stock units preserved; lossless migration script verified |

## Complete Documentation Directory (24 Core Documents)

### Architecture, Infrastructure & Migrations
1. [ARCHITECTURE.md](ARCHITECTURE.md) — Central Worker/D1 topology, 17-page storefront, 27-module admin, and complete API inventory.
2. [MIGRATIONS.md](MIGRATIONS.md) — Ordered D1 schema catalog (`0001_core.sql` through `0009_platform_completion.sql`, exact 46 tables).
3. [DATABASE_RECONCILIATION.md](DATABASE_RECONCILIATION.md) — Reconciliation across `fryzar-production`, `fryzar-core`, and `fryzar-preview` + lossless 215-unit stock preservation.
4. [CLOUDFLARE_RESOURCE_MAP.md](CLOUDFLARE_RESOURCE_MAP.md) — Exact Worker versions, D1 UUIDs, bindings, URLs, and Free-tier quota guardrails.
5. [DEPLOYMENT.md](DEPLOYMENT.md) — Preview deployment verification (`b811d6af`, `16bc6c30`, `40f93681`) and workflow controls.
6. [D1_BACKUP_RESTORE.md](D1_BACKUP_RESTORE.md) — Local automated snapshot rehearsal and verified remote preview SQL export (`C41CB588...`).

### Phase 2 Preview Acceptance, QA, Security & Performance
7. [PREVIEW_ACCEPTANCE_REPORT.md](PREVIEW_ACCEPTANCE_REPORT.md) — Phase 2 independent audit, 8 remediated defects, live preview versions, and acceptance verdict.
8. [ADMIN_MODULE_VERIFICATION.md](ADMIN_MODULE_VERIFICATION.md) — Module-by-module verification of all 27 admin modules and 7-role RBAC boundaries.
9. [CUSTOMER_JOURNEY_QA.md](CUSTOMER_JOURNEY_QA.md) — 17-page storefront EN/UR responsive QA, edge-case coverage, and keyboard accessibility.
10. [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) — Bundle/gzip sizes, Worker startup (`1–2 ms`), live HTTPS latencies, and Free-tier capacity budget.
11. [TESTING.md](TESTING.md) — Full test matrix (114 unit/routing tests, 11 D1 integration suites, 11 Playwright E2E tests).
12. [BROWSER_E2E.md](BROWSER_E2E.md) — Playwright Chromium mobile/tablet/desktop E2E coverage across storefront, SEO, ad safety, and admin roles.
13. [SECURITY_REVIEW.md](SECURITY_REVIEW.md) — PBKDF2-SHA256, `__Host-` sessions, rider horizontal isolation, refund caps, PII redaction, CORS, and `_headers`.

### Monetization Governance
14. [ADSTERRA_MONETIZATION.md](ADSTERRA_MONETIZATION.md) — 12-file modular Adsterra architecture, reconciled contract, and activation checklist.
15. [AD_SAFETY_POLICY.md](AD_SAFETY_POLICY.md) — Permanently blocked intrusive formats, sensitive categories, zero-PII telemetry, and kill switch.
16. [AD_PLACEMENT_MAP.md](AD_PLACEMENT_MAP.md) — 9 canonical `PlacementKey`s, alias mappings, density limits, and strictly ad-free routes.

### Production Launch, Cutover, Rollback & Governance
17. [PRODUCTION_CUTOVER_READINESS.md](PRODUCTION_CUTOVER_READINESS.md) — Go/No-Go engineering vs human cutover checklist.
18. [OWNER_BUSINESS_INPUTS.md](OWNER_BUSINESS_INPUTS.md) — Exact business data, phone/WhatsApp, delivery zones, and pricing required from the Owner.
19. [REMAINING_BLOCKERS.md](REMAINING_BLOCKERS.md) — Explicit separation of `0` software blockers vs remaining human/owner gates.
20. [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md) — Phased, zero-data-loss production cutover runbook.
21. [PRODUCTION_ROLLBACK_PLAN.md](PRODUCTION_ROLLBACK_PLAN.md) — Instant containment switches, Worker rollback versions, and D1 recovery safeguards.
22. [RELEASE_READINESS.md](RELEASE_READINESS.md) — Release candidate gate summary.
23. [PROJECT_STATE.md](PROJECT_STATE.md) — Reconciled platform engineering state.
24. [EXECUTION_LOG.md](EXECUTION_LOG.md) — Chronological Phase 1 & Phase 2 execution and verification log.
