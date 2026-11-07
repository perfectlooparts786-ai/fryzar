# FRYZAR Cloudflare Resource Map

**Last verified live:** 7 November 2026  
**Cloudflare Account ID:** `234b20e49261c7a002f63b129e985563`  
**Primary Domain Zone:** `fryzar.com` (Active; no Worker custom routes attached yet — production cutover remains gated)  
**Infrastructure Plan & Cost:** Cloudflare Workers Free + D1 Free (**$0.00/month**)

## 1. Cloudflare Workers Inventory (6 Total)

| Worker Name | Environment | Role | D1 / Service Bindings | Current Status & Version |
|---|---|---|---|---|
| `fryzar-api-preview` | **Preview** | Central TypeScript REST API, SEO sitemap/robots, RBAC, Checkout, Admin & Monetization API | `DB` -> `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`), Cron `17 2 * * *` | **Deployed & Accepted** (`b811d6af-78ba-4374-93d5-26eba94d7095`) |
| `fryzar-app-preview` | **Preview** | Customer Storefront React 19 SPA + `/api/*`, `/sitemap.xml`, `/robots.txt` proxy + `_headers` | `API` -> `fryzar-api-preview`, `ASSETS` -> `dist/storefront` | **Deployed & Accepted** (`16bc6c30-96ed-42b7-bdfa-26dac85b1791`) |
| `fryzar-admin-preview` | **Preview** | 27-Module Owner & Staff Control Center React 19 SPA + `/api/*` proxy + `noindex` `_headers` | `API` -> `fryzar-api-preview`, `ASSETS` -> `dist/admin` | **Deployed & Accepted** (`40f93681-a678-4867-a920-92717dd3b560`) |
| `fryzar-api` | **Production (Untouched)** | Historical candidate API Worker | `DB` -> `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`) | Untouched (`c0f0ecf8-97ef-4768-a947-f3f56be0df8e`) |
| `fryzar-app` | **Production (Untouched)** | Legacy direct-D1 customer Worker | `DB` -> `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) | Untouched (`91fdf9ab-ae00-4928-b5be-a1a356cc0f19`) |
| `fryzar-admin` | **Production (Untouched)** | Legacy direct-D1 admin Worker | `DB` -> `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) | Untouched (`80b357d6-e6ea-49a7-a6bb-0802f7b88084`) |

## 2. Cloudflare D1 Databases Inventory (3 Total)

| Database Name | Database UUID | Region | Schema State | Data State | Protection Policy |
|---|---|---|---|---|---|
| `fryzar-preview` | `a6f528a3-4b36-43a9-8e77-31f7105a4aeb` | APAC | **9 migrations applied** (`0001_core.sql` – `0009_platform_completion.sql`), 46 tables | Isolated preview environment (`store_status = setup`) | Active preview target; pre-migration backup exported & SHA-256 verified |
| `fryzar-production` | `880b9681-4252-4db0-be44-b60c4edbdc15` | APAC | Legacy 15-table schema | **3 categories, 4 products, 215 tracked stock units**, 0 orders, 0 staff | **STRICTLY READ-ONLY** until explicit owner production cutover approval |
| `fryzar-core` | `098238a6-1bda-4735-8f21-d925c7fe32de` | APAC | Earlier 4-migration schema (`0001`–`0004`), 22 tables | 0 products, 0 categories, 0 orders, 0 staff | **STRICTLY READ-ONLY** until explicit owner production cutover approval |

## 3. Preview Public Endpoints

- **Customer Storefront Preview:** `https://fryzar-app-preview.perfectlooparts786.workers.dev`
- **Admin Control Center Preview:** `https://fryzar-admin-preview.perfectlooparts786.workers.dev`
- **Central API Preview:** `https://fryzar-api-preview.perfectlooparts786.workers.dev/api/v1/health`

## 4. Free-Tier Quota Guardrails

| Resource | Cloudflare Free Limit | FRYZAR Architectural Mitigation |
|---|---|---|
| Worker Requests | 100,000 requests/day | Static assets (`index.html`, JS, CSS) served directly by Cloudflare Workers Static Assets without invoking Worker JS; only `/api/*`, `/sitemap.xml`, and `/robots.txt` invoke `run_worker_first`. |
| Worker CPU Time | 10 ms CPU/invocation | Startup time measured at **1–2 ms**; zero heavy SSR frameworks; bounded pagination (`LIMIT <= 50`, `OFFSET <= 10000`). |
| D1 Storage & Reads | 5 GB total (500 MB/DB), 5M rows read/day | Indexed queries (39 named indexes), daily cron (`17 2 * * *`) pruning at most 100 expired rate-limit/idempotency/login-attempt rows per run while preserving all order/financial/audit records. |
