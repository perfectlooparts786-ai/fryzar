const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../.test-build/api/index.js").default;

function createEnv(options = {}) {
  const firstQueue = Array.isArray(options.firstResults) ? [...options.firstResults] : null;
  const allQueue = Array.isArray(options.allResultsQueue) ? [...options.allResultsQueue] : null;
  const state = {
    prepareCount: 0,
    lastSql: "",
    lastParams: [],
    firstCount: 0,
    allCount: 0,
    batchCount: 0,
    batchStatements: []
  };

  const DB = {
    prepare(sql) {
      state.prepareCount += 1;
      state.lastSql = sql;
      const statement = {
        sql,
        params: [],
        bind(...params) {
          this.params = params;
          state.lastParams = params;
          return this;
        },
        async first() {
          state.firstCount += 1;
          if (firstQueue) return firstQueue.length ? firstQueue.shift() : null;
          return options.firstResult ?? null;
        },
        async all() {
          state.allCount += 1;
          if (allQueue) return { results: allQueue.length ? allQueue.shift() : [] };
          return { results: options.allResults ?? [] };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        }
      };
      return statement;
    },
    async batch(statements) {
      state.batchCount += 1;
      state.batchStatements = statements.map((statement) => ({
        sql: statement.sql,
        params: statement.params
      }));
      return statements.map(() => ({
        success: true,
        meta: { changes: 1 },
        results: []
      }));
    }
  };

  return {
    env: {
      DB,
      APP_ENV: "test",
      ALLOWED_ORIGINS: "http://localhost:5173",
      TRACKING_SECRET: "test-only-tracking-secret-at-least-32-bytes-long"
    },
    state
  };
}

function request(path, init = {}) {
  return new Request("http://localhost:5173" + path, init);
}

const productId = "44444444-4444-4444-8444-444444444444";
const variantId = "33333333-3333-4333-8333-333333333333";
const optionId = "22222222-2222-4222-8222-222222222222";
const zoneId = "55555555-5555-4555-8555-555555555555";

test("getProductDetails returns product, variants, and modifier groups", async () => {
  const productRow = {
    id: productId,
    slug: "classic-burger",
    sku: "BURGER-01",
    name_ur: "کلاسک برگر",
    name_en: "Classic Burger",
    price_paisa: 50000,
    compare_at_paisa: null,
    image_url: null,
    is_available: 1,
    is_featured: 1
  };
  const variantRow = {
    id: variantId,
    product_id: productId,
    sku: "BURGER-01-LARGE",
    name_ur: "بڑا",
    name_en: "Large",
    price_paisa: 65000,
    stock_qty: 10,
    is_available: 1,
    sort_order: 1
  };
  const groupRow = {
    id: "group-1",
    name_ur: "سوس",
    name_en: "Sauce",
    description_ur: "",
    description_en: "",
    min_selection: 0,
    max_selection: 2,
    is_required: 0,
    sort_order: 1
  };
  const optionRow = {
    id: optionId,
    group_id: "group-1",
    name_ur: "گارلک مائیو",
    name_en: "Garlic Mayo",
    price_paisa: 5000,
    is_available: 1,
    sort_order: 1
  };

  const { env } = createEnv({
    firstResults: [productRow],
    allResultsQueue: [
      [variantRow],
      [groupRow],
      [optionRow]
    ]
  });

  const res = await worker.fetch(request("/api/v1/products/classic-burger"), env);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.product.name_en, "Classic Burger");
  assert.equal(body.product.variants.length, 1);
  assert.equal(body.product.variants[0].name_en, "Large");
  assert.equal(body.product.modifier_groups.length, 1);
  assert.equal(body.product.modifier_groups[0].options.length, 1);
});

test("validateCouponPublic verifies valid coupon code and calculates discount", async () => {
  const couponRow = {
    id: "coupon-1",
    code: "FRYZAR10",
    discount_type: "percent",
    discount_value: 10,
    min_order_paisa: 100000,
    max_discount_paisa: 20000,
    usage_limit: 100,
    used_count: 5,
    start_at: null,
    expires_at: null,
    is_active: 1
  };

  const { env } = createEnv({ firstResult: couponRow });

  const res = await worker.fetch(request("/api/v1/coupons/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "FRYZAR10", subtotal_paisa: 150000 })
  }), env);

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.valid, true);
  assert.equal(body.discount_paisa, 15000);
});

test("validateCouponPublic rejects expired coupon code", async () => {
  const couponRow = {
    id: "coupon-2",
    code: "EXPIRED",
    discount_type: "fixed",
    discount_value: 10000,
    min_order_paisa: 0,
    max_discount_paisa: null,
    usage_limit: 10,
    used_count: 10,
    start_at: null,
    expires_at: "2020-01-01T00:00:00.000Z",
    is_active: 1
  };

  const { env } = createEnv({ firstResult: couponRow });

  const res = await worker.fetch(request("/api/v1/coupons/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "EXPIRED", subtotal_paisa: 50000 })
  }), env);

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.valid, false);
});
