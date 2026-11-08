# FRYZAR Performance, Bundle & Free-Tier Quota Baseline

**Measured on:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`  
**Target Environment:** Live Cloudflare Preview (`*.perfectlooparts786.workers.dev`) & Production Vite/Wrangler Builds

---

## 1. Production Bundle & Upload Sizes

Measured from `npm run build` (`vite v8.3.5`) and `wrangler deploy --dry-run` (`wrangler v4.156.0`):

| Artifact | Uncompressed Size | Gzip Size | Cloudflare Free Limit | Utilization |
|---|---|---|---|---|
| **Central API Worker (`fryzar-api-preview`)** | `244.21 KiB` | **`46.81 KiB`** | `3,072 KiB` (`3 MiB` gzip) | **1.5%** |
| **Customer Proxy Worker (`fryzar-app-preview`)** | `1.28 KiB` | **`0.56 KiB`** | `3,072 KiB` (`3 MiB` gzip) | **0.02%** |
| **Admin Proxy Worker (`fryzar-admin-preview`)** | `1.32 KiB` | **`0.57 KiB`** | `3,072 KiB` (`3 MiB` gzip) | **0.02%** |
| **Storefront SPA (`dist/storefront`)** | HTML `1.17 kB` + CSS `38.75 kB` + JS `345.08 kB` (`385.00 kB` total) | HTML `0.57 kB` + CSS `9.10 kB` + JS `102.02 kB` (**`111.69 kB` total**) | `25 MiB` / asset file | **< 0.5%** |
| **Admin Control Center SPA (`dist/admin`)** | HTML `0.54 kB` + CSS `33.59 kB` + JS `436.15 kB` (`470.28 kB` total) | HTML `0.54 kB` (`0.32 kB` gz) + CSS `7.28 kB` + JS `109.28 kB` (**`116.88 kB` total**) | `25 MiB` / asset file | **< 0.5%** |

- **Cloudflare Reported Worker Startup Time:** `fryzar-api-preview`: **`2 ms`** | `fryzar-app-preview`: **`1 ms`** | `fryzar-admin-preview`: **`1 ms`** (Free-tier CPU limit is `10 ms` per invocation).
- **Asset Caching:** `/assets/*` hashed JS/CSS bundles are served directly by Cloudflare Workers Static Assets with `Cache-Control: public, max-age=31536000, immutable` via `public/_headers`.

---

## 2. Live HTTPS Endpoint Latency Baseline (7 November 2026)

Measured from client to Cloudflare Edge + APAC D1 (`fryzar-preview`) across two sequential multi-sample runs (`timestamp: 2026-11-07T03:47:40Z` and post-`_headers` deploy `2026-11-07T03:50:36Z`):

| Live Preview Endpoint | HTTP Status | Warm Edge / D1 Avg Latency (Run 1 / Run 2) | Notes |
|---|---|---|---|
| `fryzar-app-preview /` (Static SPA HTML) | `200` | **`93.8 ms` – `153.8 ms`** | Served directly by Cloudflare Static Assets (`0` Worker invocations) |
| `fryzar-app-preview /api/v1/health` | `200` | **`163.3 ms` – `181.1 ms`** | Customer Worker -> Service Binding -> Central API -> D1 `sqlite_master` check |
| `fryzar-app-preview /api/v1/storefront-config` | `200` | **`155.9 ms` – `172.5 ms`** | Indexed `store_settings` read |
| `fryzar-app-preview /api/v1/monetization-config` | `200` | **`164.7 ms` – `285.2 ms`** | Public ad governance & restricted-route payload |
| `fryzar-app-preview /api/v1/editorial` | `200` | **`143.2 ms` – `752.4 ms`** | Returns 4 published bilingual guides from APAC D1 |
| `fryzar-app-preview /sitemap.xml` | `200` | **`165.4 ms` – `482.8 ms`** | Dynamic XML sitemap over categories, products, and published guides |
| `fryzar-app-preview /robots.txt` | `200` | **`145.1 ms` – `481.0 ms`** | Environment-aware crawl rules (`Disallow: /` in preview) |
| `fryzar-admin-preview /` (Static Admin HTML) | `200` | **`168.5 ms` – `270.2 ms`** | Served with `X-Robots-Tag: noindex, nofollow, noarchive` |
| `fryzar-admin-preview /api/v1/admin/session` | `401` | **`290.6 ms` – `588.6 ms`** | Unauthenticated session guard |

---

## 3. Live Headless Chrome Navigation Timing Baseline

Measured via Playwright Chrome against live `fryzar-app-preview` and `fryzar-admin-preview`:

| Scenario | Viewport | TTFB (`responseStart - requestStart`) | `domContentLoaded` | `loadEventEnd` | Layout Shift / Overflow |
|---|---|---|---|---|---|
| Storefront Desktop (EN LTR) | `1440×900` | `179 ms` – `325 ms` | `1,345 ms` – `1,580 ms` | `1,346 ms` – `1,580 ms` | `overflowX: false`, `0` ad CLS |
| Storefront Desktop (UR RTL) | `1440×900` | `86 ms` – `223 ms` | `993 ms` – `1,631 ms` | `994 ms` – `1,631 ms` | `overflowX: false`, `0` ad CLS |
| Storefront Mobile (EN LTR) | `390×844` | `99 ms` – `187 ms` | `1,012 ms` – `1,390 ms` | `1,012 ms` – `1,390 ms` | `overflowX: false`, `0` ad CLS |
| Storefront Mobile (UR RTL) | `390×844` | `86 ms` – `176 ms` | `992 ms` – `1,173 ms` | `992 ms` – `1,173 ms` | `overflowX: false`, `0` ad CLS |
| Storefront Editorial (`/editorial`) | `1280×800` | `90 ms` – `217 ms` | `942 ms` – `1,420 ms` | `942 ms` – `1,420 ms` | `overflowX: false`, `0` ad CLS |
| Admin Sign-In Desktop | `1440×900` | `142 ms` – `321 ms` | `1,551 ms` – `2,319 ms` | `1,552 ms` – `2,321 ms` | `overflowX: false` |
| Admin Sign-In Mobile | `390×844` | `169 ms` – `319 ms` | `1,426 ms` – `2,859 ms` | `1,429 ms` – `2,861 ms` | `overflowX: false` |

---

## 4. $0 Free-Tier Capacity Architecture

1. **Zero Worker Invocations for Static Assets:** `run_worker_first` is scoped strictly to `["/api", "/api/*", "/sitemap.xml", "/robots.txt"]` on Customer and `["/api", "/api/*"]` on Admin. All HTML, CSS, JS, and font requests are served free of Worker request quota.
2. **Bounded SQL Queries & Indexes:** All 39 hot-path indexes are verified in CI (`tests/migrations.integration.cjs`); admin lists enforce `LIMIT <= 50` and `OFFSET <= 10000`.
3. **Bounded Daily Retention Cron (`17 2 * * *`):** Prunes at most 100 expired rows per run from `idempotency_keys`, `api_rate_limits`, and `auth_login_attempts` (> 30 days), keeping D1 storage lean without risking CPU spikes.
