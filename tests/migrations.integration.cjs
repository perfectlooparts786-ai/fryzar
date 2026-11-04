"use strict";

const assert = require("node:assert/strict");
const { createLocalD1 } = require("./helpers/local-d1-worker.cjs");

const EXPECTED_MIGRATIONS = [
  "0001_core.sql",
  "0002_checkout_integrity.sql",
  "0003_admin_bootstrap.sql",
  "0004_inventory_adjustments.sql",
  "0005_operational_retention.sql",
  "0006_product_variants_modifiers.sql",
  "0007_delivery_and_support.sql"
];

const EXPECTED_TABLES = [
  "store_settings", "categories", "products", "product_images", "delivery_zones",
  "staff_users", "staff_sessions", "orders", "order_items", "order_status_events",
  "payments", "payment_proofs", "inventory_movements", "idempotency_keys",
  "auth_login_attempts", "api_rate_limits", "audit_logs", "notifications",
  "support_cases", "bootstrap_claims", "inventory_adjustments",
  "product_variants", "modifier_groups", "modifier_options", "product_modifier_groups",
  "coupons", "coupon_redemptions", "riders", "delivery_assignments", "support_messages"
];

const EXPECTED_INDEXES = [
  "idx_products_category_available", "idx_categories_active_sort",
  "idx_orders_created_status", "idx_orders_phone_created", "idx_order_items_order",
  "idx_order_events_order_created", "idx_payments_order_status",
  "idx_payment_proofs_payment", "idx_inventory_product_created",
  "idx_staff_sessions_user_expiry", "idx_auth_attempts_identity_time",
  "idx_rate_limits_window", "idx_audit_entity_created", "idx_support_status_created",
  "idx_notifications_recipient_created", "idx_payments_one_per_order",
  "idx_inventory_order_movement_once", "idx_inventory_adjustments_product_created",
  "idx_inventory_adjustment_movement_once", "idx_idempotency_expiry",
  "idx_auth_attempts_retention",
  "idx_variants_product_available", "idx_modifier_options_group",
  "idx_coupons_code_active", "idx_redemptions_coupon", "idx_redemptions_phone",
  "idx_riders_status", "idx_delivery_assignments_order",
  "idx_delivery_assignments_rider_status", "idx_support_messages_case"
];

async function main() {
  const db = await createLocalD1();
  try {
    const migrationLedger = db.queryRow(
      "SELECT COUNT(*) AS migration_count, GROUP_CONCAT(name, ',') AS migration_names " +
      "FROM (SELECT name FROM d1_migrations ORDER BY name)",
      ["migration_count", "migration_names"]
    );
    assert.equal(Number(migrationLedger.migration_count), EXPECTED_MIGRATIONS.length);
    assert.deepEqual(migrationLedger.migration_names.split(","), EXPECTED_MIGRATIONS);

    const tables = db.queryRow(
      "SELECT COUNT(*) AS table_count FROM sqlite_master " +
      "WHERE type = 'table' AND name IN (" +
      EXPECTED_TABLES.map((name) => "'" + name + "'").join(",") + ")",
      ["table_count"]
    );
    assert.equal(Number(tables.table_count), EXPECTED_TABLES.length);

    const indexes = db.queryRow(
      "SELECT COUNT(*) AS index_count FROM sqlite_master " +
      "WHERE type = 'index' AND name IN (" +
      EXPECTED_INDEXES.map((name) => "'" + name + "'").join(",") + ")",
      ["index_count"]
    );
    assert.equal(Number(indexes.index_count), EXPECTED_INDEXES.length);

    const triggers = db.queryRow(
      "SELECT COUNT(*) AS trigger_count FROM sqlite_master " +
      "WHERE type = 'trigger' AND name IN " +
      "('prevent_negative_product_stock', 'validate_order_item_product')",
      ["trigger_count"]
    );
    assert.equal(Number(triggers.trigger_count), 2);

    const foreignKeys = db.queryRow(
      "SELECT COUNT(*) AS violations FROM pragma_foreign_key_check",
      ["violations"]
    );
    assert.equal(Number(foreignKeys.violations), 0);

    // Re-running the migration command must be a no-op under Wrangler's ledger.
    db.applyMigrations();
    const afterReplay = db.queryRow(
      "SELECT COUNT(*) AS migration_count FROM d1_migrations",
      ["migration_count"]
    );
    assert.equal(Number(afterReplay.migration_count), EXPECTED_MIGRATIONS.length);

    console.log(
      "Local D1 migration verification passed: " +
      EXPECTED_MIGRATIONS.length + " ordered migrations, " +
      EXPECTED_TABLES.length + " application tables, " +
      EXPECTED_INDEXES.length + " expected indexes, " +
      "2 integrity triggers, zero foreign-key violations, replay unchanged."
    );
  } finally {
    await db.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
