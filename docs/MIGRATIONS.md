# FRYZAR D1 Migration Catalog & Safety Notes

**Last updated:** 7 November 2026  
**Source branch:** `feature/fryzar-master-transformation`  
**Migration sequence:** `apps/api/migrations/0001_core.sql` through `0009_platform_completion.sql` (9 ordered migrations, 46 application tables, 39 named indexes, 2 integrity triggers)  
**Automated CI verification:** `npm run test:integration:migrations` and `npm run test:integration:legacy-migration`

## Migration Execution Model

- Wrangler applies ordered SQL files from `apps/api/migrations` and records applied filenames in `d1_migrations`.
- Never manually delete or edit rows in `d1_migrations`.
- Before applying new migrations to any remote environment, export a SQL backup via `wrangler d1 export`, record its SHA-256 checksum, and rehearse local restore + forward migration.
- Remote `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`) was backed up (`SHA-256: C41CB58846B9372C9B4F0842CE9C0AB45ACB039DDFE9AEA777B34C1260D289CB`), rehearsed locally, and migrated cleanly through `0009_platform_completion.sql` on 7 November 2026.
- Production databases (`fryzar-production` and `fryzar-core`) remain untouched pending explicit Owner cutover approval.

## Complete 9-Migration Catalog

| # | Filename | Purpose & Created Objects | Compatibility & Rollback Notes |
|---|---|---|---|
| 1 | `0001_core.sql` | Core schema: `store_settings`, `categories`, `products`, `product_images`, `delivery_zones`, `staff_users`, `staff_sessions`, `orders`, `order_items`, `order_status_events`, `payments`, `payment_proofs`, `inventory_movements`, `idempotency_keys`, `auth_login_attempts`, `rate_limits`, `audit_logs`, `notifications`, `support_cases` + negative-stock guard trigger and safe closed setup defaults. | Base foundation for empty or reconciled D1 targets. |
| 2 | `0002_checkout_integrity.sql` | Enforces 1-to-1 payment-per-order uniqueness, partial unique order stock movement index, and `trg_order_items_stock_guard` trigger. | Prevents duplicate reservations and race-condition overselling. |
| 3 | `0003_admin_bootstrap.sql` | Adds `bootstrap_claims` enforcing atomic single-use `first_owner` bootstrap claim. | Security-critical; never drop on live environments. |
| 4 | `0004_inventory_adjustments.sql` | Adds `inventory_adjustments` ledger linking manual stock changes to staff actors, reasons, before/after quantities, and movement rows. | Preserves full stock auditability. |
| 5 | `0005_operational_retention.sql` | Adds expiry indexes on `idempotency_keys(expires_at)` and `auth_login_attempts(attempted_at)` for bounded daily cron cleanup (`17 2 * * *`). | Additive index-only migration; preserves all business/audit rows. |
| 6 | `0006_product_variants_modifiers.sql` | Adds `product_variants`, `modifier_groups`, `product_modifier_groups`, `modifier_options`, `order_item_modifiers`, `coupons`, and `coupon_redemptions`. | Enables multi-size pricing, required/optional add-ons, and server-verified coupon caps. |
| 7 | `0007_delivery_and_support.sql` | Adds `riders`, `delivery_assignments`, and `support_messages` for dispatch tracking and threaded customer care. | Additive tables with foreign-key integrity. |
| 8 | `0008_inventory_bom_and_finance.sql` | Adds `ingredients`, `product_recipes`, `suppliers`, `purchase_orders`, `purchase_order_items`, `wastage_logs`, and `financial_ledger`. | Supports raw ingredient BOM recipes, procurement, wastage, and double-checkable PKR paisa accounting. |
| 9 | `0009_platform_completion.sql` | Adds `customers`, `editorial_posts`, `seo_metadata`, `refund_records`, `ad_zones`, `ad_performance_daily`, `ad_events`, and `system_health_events`, plus safe disabled monetization defaults, SEO defaults, and initial bilingual food/storage guides. | Completes all 17 storefront pages, 27 owner modules, SEO, and safe Adsterra governance. |

## Local Verification Commands

```sh
npm run test:integration:migrations
npm run test:integration:legacy-migration
npm run test:integration:backup-restore
```
