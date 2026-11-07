# FRYZAR — Production Database Reconciliation & Migration Plan

**Document ID:** `02-DATABASE-MIGRATION-PLAN`  
**Status:** Verified & Rehearsed Locally / Awaiting Owner Cutover Authorization (`PRODUCTION_CUTOVER_AUTHORIZATION = NOT_GRANTED`)  
**Target Release Branch:** `release/fryzar-production-ready`  
**Cloudflare Account ID:** `234b20e49261c7a002f63b129e985563`

---

## 1. Live D1 Database Inventory (Independently Verified)

| Database Name | Database ID | Current Binding | Size (Bytes) | Tables | Indexes | Triggers | Applied Migrations | Live Business Rows |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `fryzar-production` | `880b9681-4252-4db0-be44-b60c4edbdc15` | Legacy `fryzar-app` & `fryzar-admin` (`DB`) | `196,608` | `15` | `7` | `1` | Unversioned (no `d1_migrations`) | **3 categories**, **4 products** (**215 total stock units**), 0 orders, 0 payment_records, 0 staff_users, 0 delivery_zones, 11 `store_settings` |
| `fryzar-core` | `098238a6-1bda-4735-8f21-d925c7fe32de` | Current `fryzar-api` (`DB`) | `339,968` | `22` | `19` | `2` | `0001` through `0004` (`4` rows) | 0 categories, 0 products, 0 orders, 0 payments, 0 staff_users, 0 delivery_zones, 13 `store_settings` |
| `fryzar-preview` | `a6f528a3-4b36-43a9-8e77-31f7105a4aeb` | `fryzar-api-preview` (`DB`) | `700,416` | `47` (46 app + `d1_migrations`) | `39` | `2` | `0001` through `0009` (`9` rows) | 0 categories, 0 products, 0 orders, 0 staff_users, 4 `editorial_posts`, 5 `ad_zones`, 25 `store_settings` |

---

## 2. Schema Reconciliation Summary

### 2.1 Legacy `fryzar-production` vs. Target 9-Migration Architecture (`fryzar-core`)

`fryzar-production` was created by an unversioned legacy build and lacks `d1_migrations`. Key structural differences verified against the target 9-migration schema (`apps/api/migrations/0001_*.sql` through `0009_*.sql`):

| Legacy `fryzar-production` Table / Column | Target `fryzar-core` Table / Column | Reconciliation Action |
| --- | --- | --- |
| `categories.active` (`INTEGER`) | `categories.is_active` (`INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))`) | Mapped deterministically in `scripts/migrate-legacy-production-catalogue.cjs` (`legacyTruthyFlag(cat.active, 1)`). |
| `products.active` (`INTEGER`), `products.featured` (`INTEGER`), `products.compare_at_paisa` (`INTEGER`) | `products.is_active`, `products.is_featured`, `products.compare_at_paisa` | Mapped deterministically in `scripts/migrate-legacy-production-catalogue.cjs` (`is_active`, `is_featured`, `compare_at_paisa` preserved on insert and `ON CONFLICT(slug) DO UPDATE`). |
| `products.stock_qty` (`INTEGER`) | `products.stock_quantity`, `products.track_inventory = 1`, `inventory_adjustments`, `inventory_movements` | Opening stock imported atomically with matching `inventory_adjustments` (`reason_code = 'legacy_production_import'`) and `inventory_movements` (`movement_type = 'legacy_import'`) so stock invariants hold (`SUM(delta) == stock_quantity`). |
| `payment_records` (0 rows in live DB) | `payments` + `payment_proofs` + `financial_ledger` | `payment_records` has `0` live rows in `fryzar-production`; no historical payment migration required. Target uses `payments` + double-entry `financial_ledger`. |
| `order_status_history` (0 rows in live DB) | `order_status_events` | `order_status_history` has `0` live rows (`orders` = `0`); target uses `order_status_events` with actor attribution and public timeline projection. |

### 2.2 Live Catalogue Records Verified in `fryzar-production`

**Categories (`3` rows):**
1. `cat-fresh` (`slug = 'burgers-sandwiches'`, `active = 1`, `sort_order = 1`)
2. `cat-meals` (`slug = 'wraps-sides'`, `active = 1`, `sort_order = 2`)
3. `cat-drinks` (`slug = 'beverages'`, `active = 1`, `sort_order = 3`)

**Products (`4` rows, `215` total stock units):**
1. `prd-burger` — `price_paisa = 65000` (PKR 650.00), `stock_qty = 40`, `active = 1`, `featured = 1`
2. `prd-wrap` — `price_paisa = 52000` (PKR 520.00), `stock_qty = 35`, `active = 1`, `featured = 1`
3. `prd-fries` — `price_paisa = 25000` (PKR 250.00), `stock_qty = 60`, `active = 1`, `featured = 1`
4. `prd-drink` — `price_paisa = 15000` (PKR 150.00), `stock_qty = 80`, `active = 1`, `featured = 0`

> **Important Note on Business Verification:** Although these 4 legacy catalogue rows are preserved cleanly without data loss, the store owner must still review and confirm commercial menu names, descriptions, prices, allergens, and stock quantities before switching `store_status` from `"setup"` to `"open"`.

---

## 3. Target Database Selection: `fryzar-core`

**Decision:** Retain `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`) as the canonical production D1 database for `fryzar-api`, while keeping `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) **read-only and untouched** as an immutable historical fallback archive.

**Why `fryzar-core` is the lowest-risk target:**
1. `fryzar-api` in production is already bound to `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`).
2. `fryzar-core` already tracks Cloudflare `d1_migrations` cleanly (`0001_foundation_schema.sql` through `0004_operational_controls.sql` applied).
3. Applying forward migrations `0005` through `0009` brings `fryzar-core` to exact parity (`47` tables, `39` indexes, `2` triggers) with `fryzar-preview`.
4. Keeping `fryzar-production` untouched guarantees instant zero-data-loss rollback if legacy `fryzar-app` / `fryzar-admin` Workers ever need to be restored.

---

## 4. Forward Migration Chain (`0001` – `0009`)

| Order | Migration File | Status on `fryzar-core` | Scope |
| ---: | --- | --- | --- |
| 1 | `0001_foundation_schema.sql` | Applied | Categories, products, variants, delivery zones, orders, order items, order status events, payments, staff users/sessions, store settings, audit logs, idempotency keys |
| 2 | `0002_checkout_idempotency_uniqueness.sql` | Applied | Unique constraint on `(scope, key)` for `idempotency_keys` |
| 3 | `0003_auth_bootstrap_and_throttles.sql` | Applied | `bootstrap_claims`, `auth_rate_limits` |
| 4 | `0004_operational_controls.sql` | Applied | Operational indexes, inventory adjustments/movements constraints |
| 5 | `0005_rate_limits_and_retention.sql` | **Pending Cutover** | `request_rate_limits` + retention indexes for daily cron cleanup |
| 6 | `0006_complete_platform_modules.sql` | **Pending Cutover** | Modifier groups/options, order item modifiers, coupons/redemptions, customers, kitchen queue, riders, delivery assignments, refunds, support tickets/messages, editorial posts, SEO settings, feature flags, ad zones/events |
| 7 | `0007_customer_payment_proofs_and_editorial_seed.sql` | **Pending Cutover** | `payment_proofs`, bilingual editorial guide seeds, baseline store settings |
| 8 | `0008_inventory_bom_and_finance.sql` | **Pending Cutover** | Ingredients, product recipes (BOM), suppliers, purchase orders/items, wastage logs, double-entry `financial_ledger`, settlement batches |
| 9 | `0009_adsterra_monetization_hardening.sql` | **Pending Cutover** | Adsterra placement slots, safety policy settings (`adsterra_enabled = false`), prohibited format protections |

---

## 5. Step-by-Step Cutover Migration Procedure (Execute ONLY After Owner Authorization)

### Step 1 — Pre-Migration Read-Only Export & Checksum Verification
Follow `docs/production/03-backup-restore-runbook.md` to export both `fryzar-production` and `fryzar-core`, compute SHA-256 checksums, and verify SQLite restore integrity locally before running any remote write.

### Step 2 — Re-Verify Zero New Legacy Orders in `fryzar-production`
```powershell
npx.cmd wrangler d1 execute fryzar-production --remote --command "SELECT (SELECT COUNT(*) FROM categories) AS categories, (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM payment_records) AS payments;"
```
Confirm `orders = 0` and `payments = 0`. (If any orders were placed in `fryzar-production` prior to cutover, halt and export them before proceeding.)

### Step 3 — Apply Pending Forward Migrations (`0005`–`0009`) to `fryzar-core`
```powershell
npx.cmd wrangler d1 migrations apply fryzar-core --remote --config apps/api/wrangler.production.toml
```

### Step 4 — Generate & Review Legacy Catalogue Import SQL (Dry-Run First)
Export legacy catalogue rows from the verified `fryzar-production` snapshot JSON into deterministic, idempotent import SQL:
```powershell
node scripts/migrate-legacy-production-catalogue.cjs --input backups/fryzar-production-catalogue.json --output backups/import-catalogue-to-core.sql --dry-run
```
Inspect `backups/import-catalogue-to-core.sql` and confirm:
- `categories = 3`, `products = 4`, `total_stock = 215`
- `is_active`, `is_featured`, and `compare_at_paisa` match legacy `active`, `featured`, and `compare_at_paisa`
- Opening stock creates matching `inventory_adjustments` and `inventory_movements` rows and records `legacy_production_catalogue_import_v1` in `store_settings` so re-running is strictly blocked unless clean.

### Step 5 — Execute Catalogue Import Against `fryzar-core` (Optional if Owner Chooses Legacy Seed vs. Fresh Menu)
If the owner elects to carry forward the 3 categories and 4 products from `fryzar-production`:
```powershell
npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --file backups/import-catalogue-to-core.sql
```

### Step 6 — Post-Migration Schema & Invariant Verification
```powershell
npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table') AS tables, (SELECT COUNT(*) FROM d1_migrations) AS migrations, (SELECT value_json FROM store_settings WHERE setting_key='store_status') AS store_status, (SELECT value_json FROM store_settings WHERE setting_key='adsterra_enabled') AS adsterra_enabled;"
```
Expected result:
- `tables = 47`
- `migrations = 9`
- `store_status = "\"setup\""` (remains closed until owner completes launch checklist and triggers `POST /api/v1/admin/store/launch-gate`)
- `adsterra_enabled = "false"`

---

## 6. Automated Rehearsal Evidence

- **`tests/migrations.integration.cjs`** (`npm run test:integration:migrations`): Applies all 9 migrations in sequence on clean local D1, verifies table/index/trigger counts, `PRAGMA foreign_key_check`, and `PRAGMA integrity_check`.
- **`tests/production-catalogue-migration.integration.cjs`** (`npm run test:integration:legacy-migration`): Seeds a local legacy 15-table `fryzar-production` database with exact live column names (`active`, `featured`, `compare_at_paisa`, `stock_qty`), exports JSON, applies `scripts/migrate-legacy-production-catalogue.cjs` onto a 9-migration target D1 database, and verifies exact category/product/featured/compare-at/stock/ledger parity plus duplicate-import rejection.
