# FRYZAR Controlled Production Cutover Readiness

**Last updated:** 7 November 2026  
**Candidate Branch:** `feature/fryzar-preview-acceptance`  
**Current Production Status:** **100% UNTOUCHED — AWAITING EXPLICIT OWNER CUTOVER AUTHORIZATION**

---

## 1. Verified Pre-Cutover State of Live Production Resources

Reverified read-only against Cloudflare account `234b20e49261c7a002f63b129e985563`:

| Resource | Type | UUID / Version | Current State | Cutover Role |
|---|---|---|---|---|
| `fryzar-production` | D1 Database | `880b9681-4252-4db0-be44-b60c4edbdc15` | Legacy 15-table schema; **3 categories, 4 products, 215 stock units**, `0` orders, `0` staff | **Preserved read-only** as immutable backup & source for lossless catalogue export |
| `fryzar-core` | D1 Database | `098238a6-1bda-4735-8f21-d925c7fe32de` | `0001`–`0004` applied (22 tables); **0 rows** across products, categories, orders, staff | **Primary production D1 target** (will advance cleanly `0005` -> `0009` and import the 215 stock units) |
| `fryzar-api` | Worker | `c0f0ecf8-97ef-4768-a947-f3f56be0df8e` | Bound to `fryzar-core` | Central production API target |
| `fryzar-app` | Worker | `91fdf9ab-ae00-4928-b5be-a1a356cc0f19` | Legacy direct-D1 bundle on `fryzar-production` | Customer production Worker target (`fryzar.com`) |
| `fryzar-admin` | Worker | `80b357d6-e6ea-49a7-a6bb-0802f7b88084` | Legacy direct-D1 bundle on `fryzar-production` | Admin production Worker target (`admin.fryzar.com`) |
| `fryzar.com` | Cloudflare Zone | Active | Zero Worker custom domains/routes currently attached | Attach only during final Step 6 of approved cutover |

---

## 2. Cutover Gate Checklist (Go / No-Go Criteria)

### Engineering & QA Gates (ALL COMPLETE)
- [x] Single-API-owns-D1 architecture verified on live preview (`fryzar-api-preview` `b811d6af`, `fryzar-app-preview` `16bc6c30`, `fryzar-admin-preview` `40f93681`).
- [x] Forward migration `0005`–`0009` rehearsed locally and executed cleanly on remote `fryzar-preview`.
- [x] Lossless legacy catalogue migration (`scripts/migrate-legacy-production-catalogue.cjs`) verified by `npm run test:integration:legacy-migration` (**3 categories, 4 products, 215 stock units**, replay-idempotent).
- [x] 114 unit/routing tests, 11 D1 integration suites, and 11 Playwright browser E2E tests passing (`0` failures).
- [x] GitHub Actions CI green on candidate branch.
- [x] Instant containment switches (`launch_ready = false`, Emergency Ad Kill Switch) and Worker version rollback runbook ([PRODUCTION_ROLLBACK_PLAN.md](PRODUCTION_ROLLBACK_PLAN.md)) documented.

### Human / Owner Gates (REQUIRED BEFORE EXECUTING CUTOVER)
- [ ] **Gate H1 — Owner Preview Sign-Off:** Owner reviews `https://fryzar-app-preview.perfectlooparts786.workers.dev` and `https://fryzar-admin-preview.perfectlooparts786.workers.dev`.
- [ ] **Gate H2 — Explicit Written Cutover Authorization:** Owner authorizes merging PR into `main` and executing [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md).
- [ ] **Gate H3 — Production Secrets Provisioned:** Fresh 256-bit `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN` set on `fryzar-api` (distinct from preview secrets).
- [ ] **Gate H4 — Business Configuration & Store Opening:** Owner claims production first-owner bootstrap, configures real support phone/WhatsApp + delivery zones + final PKR prices in Admin (`OwnerSetupReadinessCard` 6/6 complete), runs 1 synthetic COD test order, and opens ordering.

---

## 3. Execution Reference

Follow [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md) step-by-step during an approved low-traffic PKT maintenance window, with [PRODUCTION_ROLLBACK_PLAN.md](PRODUCTION_ROLLBACK_PLAN.md) standing by for immediate `< 2 minute` Worker version rollback if any post-cutover smoke check fails.
