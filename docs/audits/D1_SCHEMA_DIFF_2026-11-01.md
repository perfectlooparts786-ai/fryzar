# FRYZAR D1 schema comparison — 1 November 2026

## Scope and method

Read-only comparison of the exact Fryzar databases:

- `fryzar-production` — `880b9681-4252-4db0-be44-b60c4edbdc15`
- `fryzar-core` — `098238a6-1bda-4735-8f21-d925c7fe32de`

The comparison reads `sqlite_master` plus `PRAGMA table_info`, `foreign_key_list`, and `index_list` for application tables. Internal SQLite/Cloudflare objects (including `_cf_KV`) are excluded from the application table counts. No customer records, payment contents, or raw order rows were read. No database was modified.

This is a structural diff, not yet a row-by-row data mapping or migration script.

## Executive result

| Measure | fryzar-production | fryzar-core |
|---|---:|---:|
| Application tables | 15 | 22 |
| Tables with same name in both | multicolumn{2}{c}{13} |
| Product rows | 4 | 0 |
| Category rows | 3 | 0 |
| Order rows | 0 | 0 |
| Payment rows | 0 | 0 |
| Staff rows | 0 | 0 |
| Inventory movement rows | 0 | 0 |
| Tracked stock units | 215 | 0 |
| Migration ledger | Absent | 4 applied migrations |

**Conclusion:** neither database can be selected as canonical on schema age alone. `fryzar-production` currently holds the only observed catalogue and tracked stock. `fryzar-core` has a more extensive operational schema and migration ledger but no catalogue/business rows. A migration needs explicit mapping and decisions for each entity.

## Table inventory

### Production-only tables

| Table | Purpose / migration implication |
|---|---|
| `order_status_history` | Legacy order lifecycle history; map to `order_status_events` while preserving actor and note/timestamp semantics |
| `payment_records` | Legacy payment model; map to `payments` without losing reviewer, reference, review note, status, or timestamps |

### Core-only tables

| Table | Purpose / migration implication |
|---|---|
| `api_rate_limits` | Request throttling state; likely operational state, not historical business data |
| `auth_login_attempts` | Authentication attempt records; operational security state |
| `bootstrap_claims` | One-time owner bootstrap guard; must remain consistent with staff identity |
| `d1_migrations` | Core migration ledger; production has no equivalent |
| `inventory_adjustments` | Auditable manual stock adjustment ledger; legacy movements may not contain before/after balances |
| `order_status_events` | New lifecycle event model; map legacy history |
| `payments` | New payment model; map legacy payment records |
| `product_images` | Product image/object metadata; production currently has `image_url` on products and no matching table |
| `staff_sessions` | Database-backed session lifecycle and revocation; legacy admin uses stateless signed cookie logic |

## Common-table column differences

| Table | Production fields not in core | Core fields not in production | Significance |
|---|---|---|---|
| `audit_logs` | `actor_id` | `actor_staff_id` | Actor foreign-key semantics and staff references need mapping |
| `categories` | `active` | `description_ur`, `description_en`, `is_active`, `updated_at` | Active flag and bilingual descriptions require explicit conversion |
| `delivery_zones` | `active` | `code`, `country_code`, `region`, `city`, `is_active`, `created_at`, `updated_at` | Legacy zone rows need code/location fields and active-state mapping |
| `idempotency_keys` | `key` | `id`, `scope`, `idempotency_key`, `request_hash`, `expires_at` | Different uniqueness and replay semantics; legacy entries cannot be copied blindly |
| `inventory_movements` | `actor_id` | `reference_type`, `reference_id`, `actor_staff_id`, `note` | New movement provenance supports exact-once reservation/restore; historical rows need inferred/null reference data |
| `order_items` | `product_name_snapshot` | `product_name_ur_snapshot`, `product_name_en_snapshot`, `sku_snapshot` | Legacy one-name snapshots cannot recreate missing second-language names reliably |
| `orders` | none | `customer_email`, `delivery_zone_id` | Existing orders would need zone resolution; none currently observed |
| `payment_proofs` | `payment_record_id`, `mime_type`, `file_size` | `payment_id`, `detected_mime_type`, `file_size_bytes` | Foreign-key and metadata rename; private object-key/ACL implications require separate inspection |
| `products` | `featured` | `sku`, `is_featured`, `sort_order` | Featured flag rename and new catalogue metadata |
| `staff_users` | `active` | `is_active`, `password_changed_at`, `updated_at` | Active-state rename and credential lifecycle metadata |
| `store_settings` | `key`, `value` | `setting_key`, `value_json`, `is_public` | Requires value serialization and public/private classification; avoid assuming all legacy values are valid JSON |

The common table `orders` has the same listed column names, but its constraints and foreign-key definitions still differ, as described below.

## Index and trigger comparison

### Production-only indexes

- `idx_payment_records_order_status`
- `idx_support_cases_status_created`

### Core-only indexes and trigger

- `idx_audit_entity_created`
- `idx_auth_attempts_identity_time`
- `idx_categories_active_sort`
- `idx_inventory_adjustment_movement_once`
- `idx_inventory_adjustments_product_created`
- `idx_inventory_order_movement_once`
- `idx_inventory_product_created`
- `idx_order_events_order_created`
- `idx_payment_proofs_payment`
- `idx_payments_one_per_order`
- `idx_payments_order_status`
- `idx_rate_limits_window`
- `idx_staff_sessions_user_expiry`
- `idx_support_status_created`
- Trigger `validate_order_item_product`

### Shared objects with different definitions

- `idx_notifications_recipient_created`
- `idx_orders_created_status`
- `idx_orders_phone_created`
- `idx_products_category_available`
- Trigger `prevent_negative_product_stock`

The shared objects must be compared by their exact SQL definitions before attempting to recreate or replace them. Index names being the same does not establish that their indexed columns, predicates, or ordering are equal.

## Integrity and relational differences

### Product stock

- Production `products.stock_qty` has no non-negative CHECK constraint.
- Core `products.stock_qty` includes a constraint equivalent to `stock_qty IS NULL OR stock_qty >= 0`.
- The candidate API also uses guarded stock updates and movement uniqueness semantics, but it has not been proven under real concurrent D1 writes.

This is material because the deployed legacy customer Worker pre-reads stock and later decrements it without a conditional non-negative guard. Production DB constraints do not independently prevent a negative result.

### Foreign keys

- Production `orders` reports zero declared foreign keys; core `orders` declares a foreign key for the delivery-zone relationship.
- Production `order_items` reports one foreign key; core reports two.
- Production `payment_records` references orders; core `payments` references orders and reviewer staff.
- Core adds relational enforcement for sessions, inventory adjustment actors, product image ownership and other newer tables.

A row-count match alone would not prove relational integrity after moving data. Foreign-key checks and orphan queries are required after each migration stage.

### CHECK constraints

| Table | Production CHECK count | Core CHECK count |
|---|---:|---:|
| `products` | 1 | 5 |
| `orders` | 8 | 10 |
| `order_items` | 3 | 3 |
| Payment table | `payment_records`: 1 | `payments`: 3 |

These are counts from the table DDL, not a complete semantic equivalence test. The constraint text must be preserved and compared in the migration design.

## Data and migration implications

1. **Catalogue and stock:** migrate the four products, three categories, category relationships, images/URLs and 215 tracked stock units from production. Preserve IDs and unique slugs unless a collision or normalization is documented.
2. **Delivery zones:** inspect actual legacy zone rows and values before mapping `active` to `is_active`; assign stable unique `code` values and location metadata only from trustworthy store configuration.
3. **Settings:** parse and classify each existing legacy `key/value` pair. Convert to JSON only after validating each value; set `is_public` from an allowlist, never by default.
4. **Orders and items:** current aggregate counts are zero in both databases, but migration logic must still support future rollback and any new rows that appear before cutover. Preserve order-time names, prices, quantities and actor history.
5. **Payments/proofs:** map `payment_records` to `payments`; preserve status/reference/reviewer/review-note/timestamps. Reconcile proof metadata and private object storage separately. Never copy payment proof bytes to a public bucket.
6. **Staff/sessions:** no staff rows were observed. Do not copy legacy stateless cookie state into `staff_sessions`; require fresh sessions after cutover. Verify whether any owner bootstrap claim should exist.
7. **Inventory:** map movement reasons/actors and reconcile product stock against movement totals. Historical movement records may not have reliable order references. Do not invent references or opening balances.
8. **Idempotency:** legacy `idempotency_keys` has no scope, request hash or expiry. Do not treat old records as safely replayable under the new model.
9. **Indexes/triggers:** create the core integrity objects only after data validation; check for rows that violate new constraints first.
10. **Migration ledger:** production has no `d1_migrations` table. Establish a documented baseline migration representing the verified migrated schema instead of falsely recording historical migrations as having run on production.

## Required next validation

- Verify access to the raw SQL exports and independently recalculate the recorded SHA-256 hashes.
- Restore both SQL dumps into isolated non-production Cloudflare D1 databases and confirm schema, object counts, data aggregates and foreign keys.
- Run orphan, duplicate-key, invalid-enum, non-negative-stock, order/payment consistency and inventory-balance checks.
- Produce a field-by-field migration mapping with default/null policy for every destination-only column.
- Rehearse forward migration, intentional failure injection, rollback and post-rollback aggregate reconciliation.
- Recommend one canonical D1 only after the evidence is complete and obtain owner sign-off before any live binding switch.

## Explicit non-actions

This comparison did not write to either database, create or delete D1 resources, change Worker bindings, deploy code, alter DNS/routes, read customer-level rows, or retrieve secret values. The raw backup files were not available in this execution workspace, so no D1-managed restore test was performed here.
