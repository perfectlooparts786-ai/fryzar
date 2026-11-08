# FRYZAR Controlled Production Migration & Cutover Plan

**Status:** READY FOR OWNER REVIEW — **NOT EXECUTED** (Strict Production Protection Active)  
**Target Domain:** `fryzar.com` (Customer Storefront) and `admin.fryzar.com` (Owner/Staff Control Center)  
**Canonical Production API & DB Target:** `fryzar-api` -> `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`)

## 1. Pre-Cutover Mandatory Gates

Do **not** begin production cutover until all of the following are signed off by the Owner:

- [x] All 9 D1 migrations (`0001`–`0009`) verified in isolated CI and live `fryzar-preview`.
- [x] Lossless legacy catalogue migration script (`scripts/migrate-legacy-production-catalogue.cjs`) verified for 3 categories, 4 products, and 215 stock units.
- [x] All 108 unit/routing tests, 11 local Wrangler D1 integration suites, and 8 Playwright E2E browser suites passing in GitHub Actions CI.
- [x] Live preview Workers (`fryzar-api-preview`, `fryzar-app-preview`, `fryzar-admin-preview`) deployed and HTTP-verified.
- [ ] Owner reviews preview apps and confirms genuine Pakistani business details (phone/WhatsApp, operating hours, delivery zones, final PKR menu prices).
- [ ] Explicit written Owner authorization to execute production cutover.

## 2. Step-by-Step Cutover Sequence (Zero Data Loss)

### Phase A — Immutable Pre-Cutover Backups (Read-Only on Legacy DB)
1. Export `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) and `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`) SQL dumps:
   ```sh
   npx wrangler d1 export fryzar-production --remote --output backups/fryzar-production-pre-cutover.sql
   npx wrangler d1 export fryzar-core --remote --output backups/fryzar-core-pre-cutover.sql
   ```
2. Record SHA-256 hashes of both exports and verify local restore into disposable D1 directories.
3. Confirm `fryzar-production` still has `0` active in-flight orders (`SELECT COUNT(*) FROM orders`).

### Phase B — Migrate `fryzar-core` & Import Catalogue (`fryzar-production` Remains Untouched)
1. Apply migrations `0005`–`0009` to `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`).
2. Extract the 3 categories and 4 products (215 stock units) JSON snapshot from `backups/fryzar-production-pre-cutover.sql` and generate deterministic import SQL:
   ```sh
   node scripts/migrate-legacy-production-catalogue.cjs --input backups/legacy-catalogue.json --output backups/import-catalogue.sql
   ```
3. Execute `backups/import-catalogue.sql` against `fryzar-core` and verify:
   - `categories = 3`, `products = 4`, `SUM(stock_qty) = 215`
   - `PRAGMA foreign_key_check` returns `0` rows
   - `store_status` remains `"setup"` and `launch_ready` remains `false` until final smoke checks complete.

### Phase C — Configure Production Secrets & Deploy Central Architecture
1. Verify production secrets on `fryzar-api` (`TRACKING_SECRET` >= 32 random bytes, `OWNER_BOOTSTRAP_TOKEN` >= 32 random bytes) via `wrangler secret put` stdin (never logged or committed).
2. Configure production Wrangler targets (`APP_ENV = "production"`, `ALLOWED_ORIGINS = "https://fryzar.com,https://www.fryzar.com,https://admin.fryzar.com"`):
   - Deploy `fryzar-api` bound to `fryzar-core`.
   - Deploy `fryzar-app` as the static-asset + `API` service-binding Worker (`dist/storefront`).
   - Deploy `fryzar-admin` as the static-asset + `API` service-binding Worker (`dist/admin`).

### Phase D — Custom Domain Routing & Launch Opening
1. Attach Cloudflare Worker Custom Domains on zone `fryzar.com`:
   - `fryzar.com` and `www.fryzar.com` -> `fryzar-app`
   - `admin.fryzar.com` -> `fryzar-admin`
2. Claim the one-time first-owner account at `https://admin.fryzar.com` using `OWNER_BOOTSTRAP_TOKEN`, then delete/rotate the bootstrap secret.
3. Configure active delivery zone(s) in **Admin -> 14. Delivery Zones**, verify `/api/v1/health`, `/sitemap.xml`, and `/robots.txt`, and open ordering when ready.
