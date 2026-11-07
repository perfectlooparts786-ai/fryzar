# FRYZAR D1 Migration Catalog & Safety Notes

**Last updated:** 7 November 2026  
**Source branch:** `feature/fryzar-preview-acceptance`  
**Migration sequence:** `apps/api/migrations/0001_core.sql` through `0009_platform_completion.sql` (9 ordered migrations, 46 application tables, 39 named indexes, 2 integrity triggers: `prevent_negative_product_stock` and `validate_order_item_product`)  
**Automated CI verification:** `npm run test:integration:migrations` and `npm run test:integration:legacy-migration`

## Migration Execution Model

- Wrangler applies ordered SQL files from `apps/api/migrations` and records applied filenames in `d1_migrations`.
- Never manually delete or edit rows in `d1_migrations`.
- Before applying new migrations to any remote environment, export a SQL backup via `wrangler d1 export`, record its SHA-256 checksum, and rehearse local restore + forward migration.
- Remote `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`) was backed up (`SHA-256: C41CB58846B9372C9B4F0842CE9C0AB45ACB039DDFE9AEA777B34C1260D289CB`), rehearsed locally, and migrated cleanly through `0009_platform_completion.sql` on 7 November 2026.
- Production databases (`fryzar-production` and `fryzar-core`) remain untouched pending explicit Owner cutover approval.

## Complete 9-Migration Catalog (Exact 46 Application Tables)

| # | Filename | Purpose & Exact Created SQL Tables | Compatibility & Rollback Notes |
|---|---|---|---|
| 1 | `0001_core.sql` | Core schema (19 tables): `store_settings`, `categories`, `products`, `product_images`, `delivery_zones`, `staff_users`, `staff_sessions`, `orders`, `order_items`, `order_status_events`, `payments`, `payment_proofs`, `inventory_movements`, `idempotency_keys`, `auth_login_attempts`, `api_rate_limits`, `audit_logs`, `notifications`, `support_cases` + `prevent_negative_product_stock` trigger and safe closed setup defaults. | Base foundation for empty or reconciled D1 targets. |
| 2 | `0002_checkout_integrity.sql` | Enforces 1-to-1 payment-per-order uniqueness (`idx_payments_one_per_order`), partial unique order stock movement index (`idx_inventory_order_movement_once`), and `validate_order_item_product` trigger. | Prevents duplicate reservations and race-condition overselling. |
| 3 | `0003_admin_bootstrap.sql` | Adds `bootstrap_claims` (1 table) enforcing atomic single-use `first_owner` bootstrap claim. | Security-critical; never drop on live environments. |
| 4 | `0004_inventory_adjustments.sql` | Adds `inventory_adjustments` (1 table) linking manual stock changes to staff actors, reasons, before/after quantities, and movement rows. | Preserves full stock auditability. |
| 5 | `0005_operational_retention.sql` | Adds expiry indexes (`idx_idempotency_expiry`, `idx_auth_attempts_retention`) for bounded daily cron cleanup (`17 2 * * *`). | Additive index-only migration; preserves all business/audit rows. |
| 6 | `0006_product_variants_modifiers.sql` | Adds 6 tables: `product_variants`, `modifier_groups`, `modifier_options`, `product_modifier_groups`, `coupons`, `coupon_redemptions` (plus `variant_id`, `variant_name_en`, `variant_name_ur`, `selected_modifiers_json` columns on `order_items` and `discount_paisa`, `coupon_code` on `orders`). | Enables multi-size pricing, required/optional add-ons, and server-verified coupon caps. |
| 7 | `0007_delivery_and_support.sql` | Adds 3 tables: `riders`, `delivery_assignments`, and `support_messages` for dispatch tracking and threaded customer care. | Additive tables with foreign-key integrity. |
| 8 | `0008_inventory_bom_and_finance.sql` | Adds 9 tables: `ingredients`, `recipes`, `recipe_ingredients`, `suppliers`, `purchase_orders`, `purchase_order_items`, `wastage_records`, `refunds`, and `financial_ledger`. | Supports raw ingredient BOM recipes, procurement, wastage, refunds, and integer PKR paisa accounting. |
| 9 | `0009_platform_completion.sql` | Adds 7 tables: `recipe_consumptions`, `editorial_posts`, `monetization_settings`, `ad_zones`, `ad_performance_reports`, `ad_events`, and `system_events`, plus safe disabled monetization defaults, SEO defaults, and 4 bilingual food/hygiene guides. | Completes all 17 storefront pages, 27 owner modules, SEO, and safe Adsterra governance. |

## Local Verification Commands

```sh
npm run test:integration:migrations
npm run test:integration:legacy-migration
npm run test:integration:backup-restore
```
