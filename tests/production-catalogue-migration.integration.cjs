"use strict";

const assert = require("node:assert/strict");
const { createLocalD1, requestJson } = require("./helpers/local-d1-worker.cjs");
const { generateCatalogueMigrationSql } = require("../scripts/migrate-legacy-production-catalogue.cjs");

// Exact historical inventory audited from `fryzar-production` (3 categories, 4 products, 215 stock units)
const LEGACY_PRODUCTION_SNAPSHOT = {
  categories: [
    {
      id: "cat-fresh",
      slug: "fresh-picks",
      name_en: "Fresh Picks",
      name_ur: "تازہ انتخاب",
      description_en: "Signature freshly prepared items",
      description_ur: "تازہ تیار شدہ خصوصی اشیاء",
      sort_order: 1,
      active: 1
    },
    {
      id: "cat-meals",
      slug: "meals",
      name_en: "Meals & Wraps",
      name_ur: "کھانے اور ریپس",
      description_en: "Hearty grilled wraps and combo meals",
      description_ur: "مزیدار گرلڈ ریپس اور کھانے",
      sort_order: 2,
      active: 1
    },
    {
      id: "cat-drinks",
      slug: "drinks",
      name_en: "Drinks",
      name_ur: "مشروبات",
      description_en: "Chilled beverages",
      description_ur: "ٹھنڈے مشروبات",
      sort_order: 3,
      active: 1
    }
  ],
  products: [
    {
      id: "prd-burger",
      category_id: "cat-fresh",
      slug: "signature-burger",
      name_en: "Signature Burger",
      name_ur: "سگنیچر برگر",
      description_en: "Crispy house burger with signature sauce",
      description_ur: "کرسپی ہاؤس برگر خصوصی سوس کے ساتھ",
      price_paisa: 65000,
      compare_at_paisa: null,
      stock_qty: 40,
      is_available: 1,
      featured: 1,
      sort_order: 1
    },
    {
      id: "prd-fries",
      category_id: "cat-fresh",
      slug: "golden-fries",
      name_en: "Golden Fries",
      name_ur: "گولڈن فرائز",
      description_en: "Seasoned golden potato fries",
      description_ur: "مسالہ دار گولڈن فرائز",
      price_paisa: 25000,
      compare_at_paisa: null,
      stock_qty: 60,
      is_available: 1,
      featured: 1,
      sort_order: 2
    },
    {
      id: "prd-wrap",
      category_id: "cat-meals",
      slug: "grilled-wrap",
      name_en: "Grilled Wrap",
      name_ur: "گرلڈ ریپ",
      description_en: "Char-grilled tortilla wrap",
      description_ur: "گرلڈ چکن ریپ",
      price_paisa: 52000,
      compare_at_paisa: null,
      stock_qty: 35,
      is_available: 1,
      featured: 1,
      sort_order: 3
    },
    {
      id: "prd-drink",
      category_id: "cat-drinks",
      slug: "chilled-drink",
      name_en: "Chilled Drink",
      name_ur: "ٹھنڈا مشروب",
      description_en: "Refreshing chilled beverage",
      description_ur: "تازہ ٹھنڈا مشروب",
      price_paisa: 15000,
      compare_at_paisa: null,
      stock_qty: 80,
      is_available: 1,
      featured: 0,
      sort_order: 4
    }
  ]
};

async function main() {
  const generated = generateCatalogueMigrationSql(LEGACY_PRODUCTION_SNAPSHOT);
  assert.equal(generated.summary.categories_migrated, 3);
  assert.equal(generated.summary.products_migrated, 4);
  assert.equal(generated.summary.total_stock_units, 215);

  const db = await createLocalD1();
  try {
    // 1. Apply migration SQL twice to prove replay idempotency
    db.execSql(generated.sql);
    db.execSql(generated.sql);

    const counts = db.queryRow(
      "SELECT " +
      "(SELECT COUNT(*) FROM categories) AS category_count, " +
      "(SELECT COUNT(*) FROM products) AS product_count, " +
      "(SELECT COUNT(*) FROM products WHERE is_featured = 1) AS featured_count, " +
      "(SELECT SUM(stock_qty) FROM products) AS total_stock, " +
      "(SELECT SUM(delta_qty) FROM inventory_movements WHERE reason = 'stock_received') AS movement_stock, " +
      "(SELECT COUNT(*) FROM pragma_foreign_key_check) AS fk_violations",
      ["category_count", "product_count", "featured_count", "total_stock", "movement_stock", "fk_violations"]
    );

    assert.deepEqual(counts, {
      category_count: 3,
      product_count: 4,
      featured_count: 3,
      total_stock: 215,
      movement_stock: 215,
      fk_violations: 0
    });

    // 2. Enable open store & active Pakistani zone in local D1 and verify live checkout on migrated product
    const zoneId = "77777777-7777-4777-8777-777777777777";
    db.execSql(`
      UPDATE store_settings SET value_json = '"open"' WHERE setting_key = 'store_status';
      UPDATE store_settings SET value_json = 'true' WHERE setting_key = 'launch_ready';
      INSERT INTO delivery_zones (id, code, name_ur, name_en, country_code, region, city, delivery_fee_paisa, minimum_order_paisa, is_active)
      VALUES ('${zoneId}', 'LHR-GULBERG', 'گلبرگ لاہور', 'Gulberg Lahore', 'PK', 'Punjab', 'Lahore', 15000, 30000, 1);
    `);

    const baseUrl = await db.startWorker();
    const catRes = await requestJson(baseUrl, "/api/v1/categories");
    assert.equal(catRes.response.status, 200);
    assert.equal(catRes.body.categories.length, 3);

    const prodRes = await requestJson(baseUrl, "/api/v1/products");
    assert.equal(prodRes.response.status, 200);
    assert.equal(prodRes.body.products.length, 4);

    const burger = prodRes.body.products.find((p) => p.slug === "signature-burger");
    assert.ok(burger);
    assert.equal(burger.price_paisa, 65000);

    const orderRes = await requestJson(baseUrl, "/api/v1/orders", {
      method: "POST",
      headers: { "Idempotency-Key": "legacy-migrated-checkout-0001" },
      body: {
        customer_name: "Hamza Tariq",
        customer_phone: "03009876543",
        delivery_address: "Plot 18, Main Boulevard, Gulberg III, Lahore",
        delivery_zone_id: zoneId,
        customer_language: "en",
        payment_method: "cod",
        notes: "",
        items: [{ product_id: burger.id, quantity: 2 }]
      }
    });
    assert.equal(orderRes.response.status, 201);
    assert.equal(orderRes.body.order.subtotal_paisa, 130000);
    assert.equal(orderRes.body.order.total_paisa, 145000);

    await db.stopWorker();

    const postOrderStock = db.queryRow(
      "SELECT SUM(stock_qty) AS remaining_stock FROM products",
      ["remaining_stock"]
    );
    assert.equal(Number(postOrderStock.remaining_stock), 213);
  } finally {
    await db.cleanup();
  }

  process.stdout.write("Legacy production catalogue migration integration passed: 3 categories, 4 products, 215 stock units preserved losslessly, replay idempotent, and live checkout verified.\n");
}

main().catch((err) => {
  process.stderr.write((err && err.stack) || String(err));
  process.exitCode = 1;
});
