# FRYZAR Database Reconciliation & Legacy Catalogue Preservation

**Last updated:** 7 November 2026  
**Automated rehearsal test:** `npm run test:integration:legacy-migration` (`tests/production-catalogue-migration.integration.cjs`)  
**Migration generator script:** `scripts/migrate-legacy-production-catalogue.cjs`

## 1. Current Three-Database Topology

| Database | UUID | Schema | Business Data |
|---|---|---|---|
| `fryzar-production` | `880b9681-4252-4db0-be44-b60c4edbdc15` | Legacy 15-table unversioned schema (used by `fryzar-app` & `fryzar-admin`) | **3 categories, 4 products, 215 total tracked stock units**, 0 orders, 0 payments, 0 staff |
| `fryzar-core` | `098238a6-1bda-4735-8f21-d925c7fe32de` | Versioned D1 schema at migration `0004` (used by `fryzar-api`) | Empty (0 categories, 0 products, 0 orders, 0 staff) |
| `fryzar-preview` | `a6f528a3-4b36-43a9-8e77-31f7105a4aeb` | Complete 9-migration schema (`0001`–`0009`, 46 application tables) | Preview-isolated verification DB |

## 2. Why In-Place Mutation of `fryzar-production` Is Unsafe

`fryzar-production` uses legacy column names, lacks `d1_migrations` history, and is actively bound to the currently deployed `fryzar-app` and `fryzar-admin` Workers. Running `0001_core.sql`–`0009_platform_completion.sql` directly against `fryzar-production` would collide with existing table names and break the live legacy Workers mid-cutover.

## 3. Canonical Target Strategy: `fryzar-core` + Lossless Catalogue Import

During an authorized production cutover:

1. **Preserve `fryzar-production` Read-Only:** Export a fresh SQL backup of `fryzar-production` and verify its SHA-256 hash. Keep `fryzar-production` completely unmodified as an instant rollback target for legacy Workers.
2. **Advance `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`) from `0004` to `0009`:** Just as rehearsed and verified on `fryzar-preview`, `fryzar-core` already has migrations `0001`–`0004` in `d1_migrations` and zero conflicting rows, so `wrangler d1 migrations apply fryzar-core --remote` cleanly applies `0005`–`0009`.
3. **Import Legacy Catalogue & Opening Stock via `scripts/migrate-legacy-production-catalogue.cjs`:**
   - Maps legacy categories (`id`, `slug`, `name_en`, `name_ur`, `sort_order`, `is_active`) idempotently (`ON CONFLICT(slug) DO UPDATE`).
   - Maps legacy products (`id`, `slug`, `sku`, `price_paisa`, `stock_qty`, bilingual names/descriptions, `track_inventory`, `is_available`) idempotently.
   - Records audited opening stock entries in both `inventory_adjustments` (`reason = 'recount'`, `note = 'Legacy fryzar-production opening stock migration'`) and `inventory_movements` (`movement_type = 'opening_stock'`) so every single unit of the **215 tracked stock units** has a complete audit trail.

## 4. Automated Verification Proof

`tests/production-catalogue-migration.integration.cjs` executes in CI on every push:
1. Spins up an isolated local D1 database with all 9 migrations (`0001`–`0009`).
2. Runs `generateLegacyCatalogueMigrationSql` with synthetic legacy production data mirroring the exact **3 categories, 4 products, and 215 stock units**.
3. Verifies exact row counts (`categories = 3`, `products = 4`, `SUM(stock_qty) = 215`, `inventory_movements = 4`, `PRAGMA foreign_key_check = 0`).
4. Re-runs the generated SQL a second time and proves **100% idempotency** (stock remains `215`, zero duplicate movements).
5. Executes a real server-authoritative COD checkout against a migrated product and verifies atomic stock deduction (`215 -> 213`).
