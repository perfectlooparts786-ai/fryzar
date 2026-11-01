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
          if (options.throwDb) throw new Error("private test database error");
          if (firstQueue) return firstQueue.length ? firstQueue.shift() : null;
          return options.firstResult ?? null;
        },
        async all() {
          state.allCount += 1;
          if (options.throwDb) throw new Error("private test database error");
          if (allQueue) return { results: allQueue.length ? allQueue.shift() : [] };
          return { results: options.allResults ?? [] };
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
      if (options.batchError) throw options.batchError;
      return statements.map(() => ({ success: true, results: [] }));
    }
  };

  return {
    env: {
      DB,
      APP_ENV: "test",
      ALLOWED_ORIGINS: "https://store.example,https://admin.example",
      TRACKING_SECRET: options.trackingSecret ?? "test-only-tracking-secret-at-least-32-bytes-long"
    },
    state
  };
}

function request(path, init = {}) {
  return new Request("https://api.example" + path, init);
}

const zoneId = "55555555-5555-4555-8555-555555555555";
const productId = "44444444-4444-4444-8444-444444444444";

function checkoutRequest(overrides = {}, key = "checkout-test-key-0001") {
  const body = {
    customer_name: "Test Customer",
    customer_phone: "03001234567",
    delivery_address: "House 12, Main Road, Test Area",
    delivery_zone_id: zoneId,
    customer_language: "en",
    payment_method: "cod",
    notes: "",
    items: [{ product_id: productId, quantity: 2 }],
    ...overrides
  };
  return request("/api/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key
    },
    body: JSON.stringify(body)
  });
}

function openStoreRows() {
  return [
    { setting_key: "store_status", value_json: '"open"' },
    { setting_key: "launch_ready", value_json: "true" },
    { setting_key: "cod_enabled", value_json: "true" },
    { setting_key: "manual_transfer_enabled", value_json: "false" }
  ];
}

function activeProductRows() {
  return [{
    id: productId,
    sku: "TEST-001",
    name_ur: "ٹیسٹ پروڈکٹ",
    name_en: "Test Product",
    price_paisa: 15000,
    stock_qty: 5,
    is_available: 1
  }];
}

function activeZone() {
  return {
    id: zoneId,
    name_ur: "ٹیسٹ زون",
    name_en: "Test Zone",
    delivery_fee_paisa: 25000,
    minimum_order_paisa: 10000
  };
}

test("health is ready when the core schema exists", async () => {
  const { env } = createEnv({ firstResult: { name: "store_settings" } });
  const response = await worker.fetch(request("/api/v1/health"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, "ready");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("health is unavailable when migrations have not been applied", async () => {
  const { env } = createEnv();
  const response = await worker.fetch(request("/api/v1/health"), env);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.schema, "not_applied");
});

test("database errors return a generic health failure", async () => {
  const { env } = createEnv({ throwDb: true });
  const response = await worker.fetch(request("/api/v1/health"), env);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.database, "unavailable");
  assert.equal(JSON.stringify(body).includes("private test database error"), false);
});

test("categories returns the active category query result", async () => {
  const categories = [{ id: "cat-1", slug: "fresh", name_en: "Fresh", name_ur: "تازہ" }];
  const { env, state } = createEnv({ allResults: categories });
  const response = await worker.fetch(request("/api/v1/categories"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.categories, categories);
  assert.match(state.lastSql, /is_active = 1/);
});

test("invalid category filter is rejected before querying the database", async () => {
  const { env, state } = createEnv();
  const response = await worker.fetch(
    request("/api/v1/products?category=invalid%20category"),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "invalid_category");
  assert.equal(state.prepareCount, 0);
});

test("product list clamps excessive page size and binds query values", async () => {
  const products = [{ id: "product-1", price_paisa: 25000 }];
  const { env, state } = createEnv({ allResults: products });
  const response = await worker.fetch(
    request("/api/v1/products?category=fresh&limit=999"),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.limit, 50);
  assert.deepEqual(body.products, products);
  assert.deepEqual(state.lastParams, ["fresh", 50]);
  assert.match(state.lastSql, /LIMIT \?2/);
});

test("public configuration parses JSON values from allowlisted rows", async () => {
  const rows = [
    { setting_key: "currency", value_json: '"PKR"' },
    { setting_key: "supported_languages", value_json: '["ur","en"]' }
  ];
  const { env } = createEnv({ allResults: rows });
  const response = await worker.fetch(request("/api/v1/storefront-config"), env);
  const body = await response.json();

  assert.equal(body.settings.currency, "PKR");
  assert.deepEqual(body.settings.supported_languages, ["ur", "en"]);
});

test("disallowed browser origins are rejected", async () => {
  const { env } = createEnv();
  const response = await worker.fetch(
    request("/api/v1/categories", { headers: { Origin: "https://untrusted.example" } }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "origin_not_allowed");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("approved browser origins receive an exact CORS response", async () => {
  const { env } = createEnv({ allResults: [] });
  const response = await worker.fetch(
    request("/api/v1/categories", { headers: { Origin: "https://store.example" } }),
    env
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://store.example");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
});

test("preflight requests return no content and the approved origin", async () => {
  const { env } = createEnv();
  const response = await worker.fetch(
    request("/api/v1/checkout", {
      method: "OPTIONS",
      headers: {
        Origin: "https://store.example",
        "Access-Control-Request-Method": "POST"
      }
    }),
    env
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://store.example");
});

test("unknown routes return a stable 404 response", async () => {
  const { env } = createEnv();
  const response = await worker.fetch(request("/api/v1/not-a-route"), env);

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "not_found");
});

test("checkout requires an idempotency key before reading the database", async () => {
  const { env, state } = createEnv();
  const response = await worker.fetch(checkoutRequest({}, ""), env);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "idempotency_key_required");
  assert.equal(state.prepareCount, 0);
});

test("checkout stays closed until store launch readiness is enabled", async () => {
  const setupRows = [
    { setting_key: "store_status", value_json: '"setup"' },
    { setting_key: "launch_ready", value_json: "false" }
  ];
  const { env, state } = createEnv({ allResults: setupRows });
  const response = await worker.fetch(checkoutRequest(), env);

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "store_not_accepting_orders");
  assert.equal(state.batchCount, 0);
});

test("manual transfer cannot be selected while the feature flag is disabled", async () => {
  const { env, state } = createEnv({ allResults: openStoreRows() });
  const response = await worker.fetch(
    checkoutRequest({ payment_method: "manual_transfer" }),
    env
  );

  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, "payment_method_unavailable");
  assert.equal(state.batchCount, 0);
});

test("successful COD checkout uses server prices and creates an atomic batch", async () => {
  const secret = "test-only-tracking-secret-at-least-32-bytes-long";
  const { env, state } = createEnv({
    trackingSecret: secret,
    firstResults: [null, activeZone()],
    allResultsQueue: [openStoreRows(), activeProductRows()]
  });

  const response = await worker.fetch(checkoutRequest(), env);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.order.payment_method, "cod");
  assert.equal(body.order.payment_status, "unpaid");
  assert.equal(body.order.subtotal_paisa, 30000);
  assert.equal(body.order.delivery_fee_paisa, 25000);
  assert.equal(body.order.total_paisa, 55000);
  assert.match(body.tracking_token, /^[a-f0-9]{64}$/);
  assert.equal(state.batchCount, 1);
  assert.ok(state.batchStatements.some((item) => item.sql.includes("INSERT INTO payments")));
  assert.ok(state.batchStatements.some((item) => item.sql.includes("UPDATE products")));
  assert.ok(state.batchStatements.some((item) => item.sql.includes("INSERT INTO idempotency_keys")));
  assert.equal(state.batchStatements.length, 9);
});

test("tracking returns order summary without customer phone or delivery address", async () => {
  const token = "a".repeat(64);
  const savedOrder = {
    id: "order-1",
    order_number: "FRZ-20261101-ABC123",
    status: "pending",
    payment_method: "cod",
    payment_status: "unpaid",
    subtotal_paisa: 30000,
    delivery_fee_paisa: 25000,
    discount_paisa: 0,
    total_paisa: 55000,
    customer_language: "en",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z"
  };
  const savedItems = [{
    product_name_en_snapshot: "Test Product",
    unit_price_paisa: 15000,
    quantity: 2,
    line_total_paisa: 30000
  }];
  const { env } = createEnv({ firstResult: savedOrder, allResults: savedItems });
  const response = await worker.fetch(
    request("/api/v1/orders/track/" + token),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.order.order_number, savedOrder.order_number);
  assert.deepEqual(body.items, savedItems);
  assert.equal("customer_phone" in body.order, false);
  assert.equal("delivery_address" in body.order, false);
});
