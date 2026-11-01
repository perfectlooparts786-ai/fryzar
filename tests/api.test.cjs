const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
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
      return statements.map((_, index) => ({
        success: true,
        meta: { changes: Array.isArray(options.batchChanges)
          ? (options.batchChanges[index] ?? 0)
          : (index === 0 ? 1 : 0) },
        results: []
      }));
    }
  };

  return {
    env: {
      DB,
      APP_ENV: "test",
      ALLOWED_ORIGINS: "https://store.example,https://admin.example",
      TRACKING_SECRET: options.trackingSecret ?? "test-only-tracking-secret-at-least-32-bytes-long",
      OWNER_BOOTSTRAP_TOKEN: options.ownerBootstrapToken ?? "test-owner-bootstrap-token-at-least-32-bytes"
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

function checkoutRequestHash(overrides = {}) {
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
  const canonical = {
    customer_name: body.customer_name,
    customer_phone: body.customer_phone,
    delivery_address: body.delivery_address,
    delivery_zone_id: body.delivery_zone_id,
    customer_language: body.customer_language,
    payment_method: body.payment_method,
    notes: body.notes,
    items: [...body.items].sort((left, right) => left.product_id.localeCompare(right.product_id))
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
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

test("delivery zones expose only active public zone details", async () => {
  const zones = [{
    id: "zone-1",
    code: "city-centre",
    name_en: "City Centre",
    name_ur: "شہر کا مرکز",
    city: "Test City",
    region: "Punjab",
    delivery_fee_paisa: 15000,
    minimum_order_paisa: 50000
  }];
  const { env, state } = createEnv({ allResults: zones });
  const response = await worker.fetch(request("/api/v1/delivery-zones"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.delivery_zones, zones);
  assert.equal(body.currency, "PKR");
  assert.match(state.lastSql, /is_active = 1/);
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
  const stockReservation = state.batchStatements.find((item) => item.sql.includes("UPDATE products"));
  assert.ok(stockReservation);
  assert.ok(stockReservation.sql.includes("stock_qty IS NULL OR stock_qty >= ?1"));
  assert.ok(state.batchStatements.some((item) => item.sql.includes("INSERT INTO idempotency_keys")));
  assert.equal(state.batchStatements.length, 9);
});

test("checkout replays the original order for the same idempotency key and payload", async () => {
  const key = "checkout-replay-test-0001";
  const savedResponse = {
    order: {
      id: "saved-order-1",
      order_number: "FRZ-20261101-ABC123",
      status: "pending",
      payment_method: "cod",
      payment_status: "unpaid",
      currency: "PKR",
      subtotal_paisa: 30000,
      delivery_fee_paisa: 25000,
      total_paisa: 55000,
      created_at: "2026-11-01T00:00:00.000Z"
    }
  };
  const existing = {
    request_hash: checkoutRequestHash(),
    response_json: JSON.stringify(savedResponse),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  const { env, state } = createEnv({ firstResults: [existing] });

  const response = await worker.fetch(checkoutRequest({}, key), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Idempotent-Replay"), "true");
  assert.equal(body.order.id, "saved-order-1");
  assert.equal(body.order.order_number, "FRZ-20261101-ABC123");
  assert.equal(state.batchCount, 0);
  assert.equal(state.firstCount, 1);
});

test("checkout rejects reusing an idempotency key with a different request payload", async () => {
  const existing = {
    request_hash: "f".repeat(64),
    response_json: JSON.stringify({ order: { id: "saved-order-2" } }),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  const { env, state } = createEnv({ firstResults: [existing] });

  const response = await worker.fetch(
    checkoutRequest({ notes: "Changed request payload" }, "checkout-replay-test-0002"),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "idempotency_key_reused");
  assert.equal(state.batchCount, 0);
  assert.equal(state.firstCount, 1);
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


async function makeTestPasswordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310000 },
    key,
    256
  );
  const encode = (bytes) => Buffer.from(bytes).toString("base64");
  return "pbkdf2_sha256$310000$" + encode(salt) + "$" + encode(new Uint8Array(bits));
}

test("owner bootstrap requires an allowed browser origin", async () => {
  const { env, state } = createEnv();
  const response = await worker.fetch(
    request("/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Owner-Bootstrap-Token": "test-owner-bootstrap-token-at-least-32-bytes"
      },
      body: JSON.stringify({
        email: "owner@example.test",
        display_name: "FRYZAR Owner",
        password: "a-strong-test-password-123"
      })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal(state.firstCount, 0);
});

test("owner bootstrap creates one atomic owner and returns a secure session cookie", async () => {
  const { env, state } = createEnv({ firstResults: [null, { user_count: 0 }] });
  const response = await worker.fetch(
    request("/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        "Content-Type": "application/json",
        "X-Owner-Bootstrap-Token": "test-owner-bootstrap-token-at-least-32-bytes"
      },
      body: JSON.stringify({
        email: "owner@example.test",
        display_name: "FRYZAR Owner",
        password: "a-strong-test-password-123"
      })
    }),
    env
  );
  const body = await response.json();
  const cookie = response.headers.get("Set-Cookie");

  assert.equal(response.status, 201);
  assert.equal(body.authenticated, true);
  assert.equal(body.user.role, "owner");
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 4);
  assert.match(state.batchStatements[0].sql, /bootstrap_claims/);
  assert.match(state.batchStatements[1].sql, /staff_users/);
  assert.match(state.batchStatements[2].sql, /staff_sessions/);
  assert.match(cookie, /^__Host-fryzar_admin=[a-f0-9]{64}/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.equal(JSON.stringify(body).includes("a-strong-test-password-123"), false);
});

test("owner bootstrap refuses when the single-use claim is already consumed", async () => {
  const { env, state } = createEnv({
    firstResults: [{ claim_key: "first_owner" }, { user_count: 1 }]
  });
  const response = await worker.fetch(
    request("/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        "Content-Type": "application/json",
        "X-Owner-Bootstrap-Token": "test-owner-bootstrap-token-at-least-32-bytes"
      },
      body: JSON.stringify({
        email: "second@example.test",
        display_name: "Second Owner",
        password: "a-strong-test-password-456"
      })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "owner_already_configured");
  assert.equal(state.batchCount, 0);
});

test("admin session endpoint rejects missing session cookies", async () => {
  const { env } = createEnv();
  const response = await worker.fetch(request("/api/v1/admin/session"), env);

  assert.equal(response.status, 401);
  assert.equal((await response.json()).authenticated, false);
});

test("admin login creates a secure HttpOnly session after password verification", async () => {
  const password = "a-strong-test-password-789";
  const passwordHash = await makeTestPasswordHash(password);
  const staff = {
    id: "staff-1",
    email: "owner@example.test",
    display_name: "FRYZAR Owner",
    role: "owner",
    is_active: 1,
    password_hash: passwordHash
  };
  const { env, state } = createEnv({ firstResults: [staff] });
  const response = await worker.fetch(
    request("/api/v1/admin/login", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: "owner@example.test", password })
    }),
    env
  );
  const body = await response.json();
  const cookie = response.headers.get("Set-Cookie");

  assert.equal(response.status, 200);
  assert.equal(body.authenticated, true);
  assert.equal(body.user.role, "owner");
  assert.match(cookie, /^__Host-fryzar_admin=[a-f0-9]{64}/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(state.batchCount, 1);
});

test("admin login returns the same generic failure for a wrong password", async () => {
  const passwordHash = await makeTestPasswordHash("correct-password-123");
  const staff = {
    id: "staff-1",
    email: "owner@example.test",
    display_name: "FRYZAR Owner",
    role: "owner",
    is_active: 1,
    password_hash: passwordHash
  };
  const { env, state } = createEnv({ firstResults: [staff] });
  const response = await worker.fetch(
    request("/api/v1/admin/login", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: "owner@example.test", password: "incorrect-password" })
    }),
    env
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "invalid_credentials");
  assert.equal(state.batchCount, 0);
});


test("finance role cannot read the order list", async () => {
  const token = "b".repeat(64);
  const staff = {
    id: "finance-1",
    email: "finance@example.test",
    display_name: "Finance Staff",
    role: "finance",
    is_active: 1
  };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/orders", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.allCount, 0);
});

test("kitchen order list query does not select customer contact or address", async () => {
  const token = "c".repeat(64);
  const staff = {
    id: "kitchen-1",
    email: "kitchen@example.test",
    display_name: "Kitchen Staff",
    role: "kitchen",
    is_active: 1
  };
  const { env, state } = createEnv({
    firstResult: staff,
    allResults: [{ id: "order-1", order_number: "FRZ-TEST", status: "pending" }]
  });
  const response = await worker.fetch(
    request("/api/v1/admin/orders", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.orders, [{ id: "order-1", order_number: "FRZ-TEST", status: "pending" }]);
  assert.match(state.lastSql, /NULL AS customer_phone/);
  assert.match(state.lastSql, /NULL AS delivery_address/);
  assert.doesNotMatch(state.lastSql, /SELECT[^]*customer_phone, delivery_address/);
});

test("invalid order status filter is rejected", async () => {
  const token = "d".repeat(64);
  const staff = {
    id: "owner-1",
    email: "owner@example.test",
    display_name: "Owner",
    role: "owner",
    is_active: 1
  };
  const { env } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/orders?status=made_up", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_order_status");
});

test("kitchen role cannot cancel orders", async () => {
  const token = "e".repeat(64);
  const staff = {
    id: "kitchen-1",
    email: "kitchen@example.test",
    display_name: "Kitchen",
    role: "kitchen",
    is_active: 1
  };
  const order = { id: "11111111-1111-4111-8111-111111111111", status: "preparing", payment_status: "unpaid" };
  const { env, state } = createEnv({ firstResults: [staff, order] });
  const response = await worker.fetch(
    request("/api/v1/admin/orders/" + order.id + "/status", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "cancelled" })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal(state.batchCount, 0);
});

test("manager cancellation atomically includes stock restoration and audit history", async () => {
  const token = "f".repeat(64);
  const staff = {
    id: "manager-1",
    email: "manager@example.test",
    display_name: "Manager",
    role: "manager",
    is_active: 1
  };
  const order = { id: "11111111-1111-4111-8111-111111111111", status: "pending", payment_status: "unpaid" };
  const { env, state } = createEnv({ firstResults: [staff, order] });
  const response = await worker.fetch(
    request("/api/v1/admin/orders/" + order.id + "/status", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "cancelled", note: "Customer requested cancellation" })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "cancelled");
  assert.equal(state.batchCount, 1);
  assert.ok(state.batchStatements.some(item => item.sql.includes("UPDATE products SET stock_qty = stock_qty +")));
  assert.ok(state.batchStatements.some(item => item.sql.includes("'order_cancelled'")));
  assert.ok(state.batchStatements.some(item => item.sql.includes("order_status_events")));
  assert.ok(state.batchStatements.some(item => item.sql.includes("order.status_changed")));
  assert.ok(state.batchStatements.some(item => item.sql.includes("updated_at = ?2")));
});


test("manager inventory adjustment writes quantity, adjustment ledger, movement and audit in one batch", async () => {
  const token = "a".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const product = { id: productId, stock_qty: 8 };
  const { env, state } = createEnv({ firstResults: [staff, null, product], batchChanges: [0, 1, 1, 1, 1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "inventory-adjustment-test-0001",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: productId, delta_qty: 12, reason: "stock_received", note: "Supplier delivery" })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.adjusted, true);
  assert.equal(body.delta_qty, 12);
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 6);
  assert.match(state.batchStatements[1].sql, /stock_qty = stock_qty \+ \?1/);
  assert.match(state.batchStatements[1].sql, /stock_qty \+ \?1 >= 0/);
  assert.match(state.batchStatements[2].sql, /INSERT INTO inventory_adjustments/);
  assert.match(state.batchStatements[2].sql, /changes\(\) = 1/);
  assert.match(state.batchStatements[3].sql, /INSERT INTO inventory_movements/);
  assert.match(state.batchStatements[4].sql, /inventory.stock_adjusted/);
  assert.match(state.batchStatements[5].sql, /inventory_adjustment/);
});

test("inventory adjustment rejects a stock reduction below zero before writing", async () => {
  const token = "b".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const product = { id: productId, stock_qty: 3 };
  const { env, state } = createEnv({ firstResults: [staff, null, product] });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "inventory-adjustment-test-0002",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: productId, delta_qty: -4, reason: "stock_adjustment" })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "insufficient_stock");
  assert.equal(state.batchCount, 0);
});

test("inventory adjustment rejects untracked stock quantities", async () => {
  const token = "c".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const product = { id: productId, stock_qty: null };
  const { env, state } = createEnv({ firstResults: [staff, null, product] });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "inventory-adjustment-test-0003",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: productId, delta_qty: 4, reason: "stock_received" })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "inventory_not_tracked");
  assert.equal(state.batchCount, 0);
});

test("operator role cannot submit manual inventory adjustments", async () => {
  const token = "d".repeat(64);
  const staff = { id: "operator-1", email: "operator@example.test", display_name: "Operator", role: "operator", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: productId, delta_qty: 5, reason: "stock_received" })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.batchCount, 0);
});

test("inventory movement history is restricted to authorized operations roles", async () => {
  const token = "e".repeat(64);
  const staff = { id: "finance-1", email: "finance@example.test", display_name: "Finance", role: "finance", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/movements", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.allCount, 0);
});

test("product update cannot bypass the inventory adjustment ledger", async () => {
  const token = "f".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const productIdToUpdate = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/products/" + productIdToUpdate, {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        slug: "edited-product",
        name_en: "Edited Product",
        name_ur: "ترمیم شدہ",
        price_paisa: 1200,
        stock_qty: 99
      })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "inventory_adjustment_required");
  assert.equal(state.batchCount, 0);
});


test("new products with opening stock create matching adjustment and movement records", async () => {
  const token = "1".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff, batchChanges: [1, 1, 1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/products", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        slug: "initial-stock-product",
        name_en: "Initial Stock Product",
        name_ur: "ابتدائی اسٹاک",
        price_paisa: 25000,
        stock_qty: 15,
        is_available: true
      })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.saved, true);
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 4);
  assert.match(state.batchStatements[1].sql, /inventory_adjustments/);
  assert.match(state.batchStatements[1].sql, /Opening stock at product creation/);
  assert.match(state.batchStatements[2].sql, /inventory_movements/);
  assert.match(state.batchStatements[3].sql, /product.created/);
});


test("inventory adjustment requires an idempotency key", async () => {
  const token = "2".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: productId, delta_qty: 2, reason: "stock_received" })
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "idempotency_key_required");
  assert.equal(state.batchCount, 0);
});

test("inventory adjustment replays the stored response for an identical idempotency key", async () => {
  const token = "3".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const payload = { product_id: productId, delta_qty: 5, reason: "stock_received", note: "" };
  const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const storedResponse = { adjusted: true, adjustment_id: "inventory-adjustment-1", product_id: productId, delta_qty: 5, reason: "stock_received" };
  const existing = {
    request_hash: requestHash,
    response_json: JSON.stringify(storedResponse),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  const { env, state } = createEnv({ firstResults: [staff, existing] });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "inventory-adjustment-replay-0001",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }),
    env
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Idempotent-Replay"), "true");
  assert.deepEqual(await response.json(), storedResponse);
  assert.equal(state.batchCount, 0);
});

test("inventory adjustment rejects reuse of a key with a different payload", async () => {
  const token = "4".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const originalPayload = { product_id: productId, delta_qty: 5, reason: "stock_received", note: "" };
  const requestHash = createHash("sha256").update(JSON.stringify(originalPayload)).digest("hex");
  const existing = {
    request_hash: requestHash,
    response_json: JSON.stringify({ adjusted: true }),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  const { env, state } = createEnv({ firstResults: [staff, existing] });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "inventory-adjustment-replay-0002",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...originalPayload, delta_qty: 6 })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "idempotency_key_reused");
  assert.equal(state.batchCount, 0);
});


test("inventory adjustment detects a concurrent stock change inside the write batch", async () => {
  const token = "5".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const product = { id: productId, stock_qty: 5 };
  const { env, state } = createEnv({
    firstResults: [staff, null, product],
    batchChanges: [0, 0, 0, 0, 0, 0]
  });
  const response = await worker.fetch(
    request("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "inventory-adjustment-race-0001",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_id: productId, delta_qty: 2, reason: "stock_received" })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "stock_changed_retry");
  assert.equal(state.batchCount, 1);
  assert.match(state.batchStatements[2].sql, /changes\(\) = 1/);
});


test("manager can create a delivery zone with an audit record in one batch", async () => {
  const token = "6".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff, batchChanges: [1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/delivery-zones", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "WAH-CANTT",
        name_en: "Wah Cantt",
        name_ur: "واہ کینٹ",
        country_code: "PK",
        region: "Punjab",
        city: "Wah",
        delivery_fee_paisa: 15000,
        minimum_order_paisa: 50000,
        is_active: true
      })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.saved, true);
  assert.match(body.id, /^[0-9a-f-]{36}$/i);
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 2);
  assert.match(state.batchStatements[0].sql, /INSERT INTO delivery_zones/);
  assert.equal(state.batchStatements[1].params[3], "delivery_zone.created");
  assert.equal(state.batchStatements[0].params[1], "WAH-CANTT");
  assert.equal(state.batchStatements[0].params[7], 15000);
  assert.equal(state.batchStatements[0].params[8], 50000);
});

test("owner can update and deactivate an existing delivery zone without deleting it", async () => {
  const token = "7".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const zoneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const { env, state } = createEnv({ firstResult: staff, batchChanges: [1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/delivery-zones/" + zoneId, {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "WAH-CANTT",
        name_en: "Wah Cantt",
        name_ur: "واہ کینٹ",
        country_code: "PK",
        region: "Punjab",
        city: "Wah",
        delivery_fee_paisa: 18000,
        minimum_order_paisa: 60000,
        is_active: false
      })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.saved, true);
  assert.equal(state.batchCount, 1);
  assert.match(state.batchStatements[0].sql, /UPDATE delivery_zones SET/);
  assert.match(state.batchStatements[0].sql, /is_active=\?9/);
  assert.equal(state.batchStatements[1].params[3], "delivery_zone.updated");
  assert.equal(state.batchStatements[0].params[8], 0);
  assert.equal(state.batchStatements[0].params[10], zoneId);
});

test("invalid delivery zone data is rejected before database writes", async () => {
  const token = "8".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/delivery-zones", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "Bad code",
        name_en: "Invalid",
        name_ur: "غلط",
        country_code: "Pakistan",
        city: "Wah",
        delivery_fee_paisa: -1,
        minimum_order_paisa: 0
      })
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "validation_failed");
  assert.equal(state.batchCount, 0);
});

test("operator cannot create or edit delivery zones", async () => {
  const token = "9".repeat(64);
  const staff = { id: "operator-1", email: "operator@example.test", display_name: "Operator", role: "operator", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/delivery-zones", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code: "ZONE-01", name_en: "Zone", name_ur: "علاقہ", country_code: "PK", city: "Wah", delivery_fee_paisa: 0, minimum_order_paisa: 0 })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.batchCount, 0);
});

test("rider can read delivery zones including inactive records", async () => {
  const token = "a".repeat(64);
  const staff = { id: "rider-1", email: "rider@example.test", display_name: "Rider", role: "rider", is_active: 1 };
  const zones = [{ id: "zone-1", code: "ZONE-01", is_active: 0 }];
  const { env, state } = createEnv({ firstResult: staff, allResults: zones });
  const response = await worker.fetch(
    request("/api/v1/admin/delivery-zones", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.delivery_zones, zones);
  assert.match(state.lastSql, /FROM delivery_zones ORDER BY/);
  assert.doesNotMatch(state.lastSql, /WHERE is_active = 1/);
});

test("duplicate delivery zone code maps to a conflict response", async () => {
  const token = "b".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff, batchError: new Error("UNIQUE constraint failed: delivery_zones.code") });
  const response = await worker.fetch(
    request("/api/v1/admin/delivery-zones", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code: "WAH-02", name_en: "Wah", name_ur: "واہ", country_code: "PK", city: "Wah", delivery_fee_paisa: 10000, minimum_order_paisa: 0 })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "delivery_zone_code_conflict");
  assert.equal(state.batchCount, 1);
});


test("owner can read public store configuration through admin settings endpoint", async () => {
  const token = "c".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const settings = [
    { setting_key: "store_status", value_json: '"setup"' },
    { setting_key: "launch_ready", value_json: "false" },
    { setting_key: "manual_transfer_enabled", value_json: "false" },
    { setting_key: "store_name_en", value_json: '"FRYZAR"' }
  ];
  const { env, state } = createEnv({ firstResult: staff, allResults: settings });
  const response = await worker.fetch(
    request("/api/v1/admin/settings", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.settings.store_status, "setup");
  assert.equal(body.settings.launch_ready, false);
  assert.equal(body.settings.manual_transfer_enabled, false);
  assert.equal(body.settings.store_name_en, "FRYZAR");
  assert.match(state.lastSql, /WHERE is_public = 1/);
});

test("manager can update allowed store settings with audit in one batch", async () => {
  const token = "d".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff, batchChanges: [1, 1, 1, 1, 1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        store_name_en: "FRYZAR Market",
        store_name_ur: "فریزر مارکیٹ",
        default_language: "en",
        cod_enabled: true,
        whatsapp_number: "+923001234567",
        store_status: "paused"
      })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.saved, true);
  assert.deepEqual(body.updated_keys, [
    "cod_enabled", "default_language", "store_name_en", "store_name_ur", "store_status", "whatsapp_number"
  ]);
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 7);
  assert.match(state.batchStatements[0].sql, /INSERT INTO store_settings/);
  assert.equal(state.batchStatements[0].params[0], "store_name_en");
  assert.equal(state.batchStatements[0].params[1], '"FRYZAR Market"');
  assert.match(state.batchStatements[6].sql, /store.settings_updated/);
});

test("store settings cannot change launch readiness or enable manual transfer", async () => {
  const token = "e".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ launch_ready: true, manual_transfer_enabled: true })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "setting_requires_release_gate");
  assert.equal(state.batchCount, 0);
});

test("store settings cannot open the store through the settings endpoint", async () => {
  const token = "f".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ store_status: "open" })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "store_requires_release_gate");
  assert.equal(state.batchCount, 0);
});

test("operator can read settings but cannot edit them", async () => {
  const token = "1".repeat(64);
  const staff = { id: "operator-1", email: "operator@example.test", display_name: "Operator", role: "operator", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cod_enabled: false })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.batchCount, 0);
});


test("invalid international store contact number is rejected before writes", async () => {
  const token = "2".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ whatsapp_number: "not-a-phone" })
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_whatsapp_number");
  assert.equal(state.batchCount, 0);
});


test("owner can create a manager account with a hashed password and audit record", async () => {
  const token = "3".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff, batchChanges: [1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "manager@example.test",
        display_name: "Store Manager",
        role: "manager",
        password: "SecureManagerPass123"
      })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.created, true);
  assert.equal(body.role, "manager");
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 2);
  assert.match(state.batchStatements[0].sql, /INSERT INTO staff_users/);
  assert.notEqual(state.batchStatements[0].params[2], "SecureManagerPass123");
  assert.match(state.batchStatements[0].params[2], /^pbkdf2_sha256\$/);
  assert.match(state.batchStatements[1].sql, /staff.user_created/);
});

test("manager can create an operator but cannot assign management roles", async () => {
  const token = "4".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff, batchChanges: [1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "operator@example.test",
        display_name: "Operator",
        role: "operator",
        password: "SecureOperatorPass123"
      })
    }),
    env
  );

  assert.equal(response.status, 201);
  assert.equal(state.batchCount, 1);
});

test("manager cannot create another manager account", async () => {
  const token = "5".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/staff", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "another-manager@example.test",
        display_name: "Another Manager",
        role: "manager",
        password: "SecureManagerPass123"
      })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "role_assignment_denied");
  assert.equal(state.batchCount, 0);
});

test("staff list never selects password hashes and is limited to owner/manager", async () => {
  const token = "6".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const rows = [{ id: "operator-1", email: "operator@example.test", role: "operator", is_active: 1 }];
  const { env, state } = createEnv({ firstResult: staff, allResults: rows });
  const response = await worker.fetch(
    request("/api/v1/admin/staff", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.staff, rows);
  assert.doesNotMatch(state.lastSql, /password_hash/);
});

test("operator cannot read the staff directory", async () => {
  const token = "7".repeat(64);
  const staff = { id: "operator-1", email: "operator@example.test", display_name: "Operator", role: "operator", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/staff", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.allCount, 0);
});

test("manager cannot update another manager or owner account", async () => {
  const token = "8".repeat(64);
  const actor = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const target = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResults: [actor, target] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff/" + target.id, {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_active: false })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.batchCount, 0);
});

test("owner cannot deactivate the first owner account", async () => {
  const token = "9".repeat(64);
  const actor = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const target = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "owner", is_active: 1 };
  const { env, state } = createEnv({ firstResults: [actor, target] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff/" + target.id, {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_active: false })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "cannot_deactivate_self");
  assert.equal(state.batchCount, 0);
});

test("role change revokes the target staff sessions and records an audit event", async () => {
  const token = "a".repeat(64);
  const actor = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const target = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", role: "operator", is_active: 1 };
  const { env, state } = createEnv({ firstResults: [actor, target], batchChanges: [1, 1, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff/" + target.id, {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role: "kitchen" })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.sessions_revoked, true);
  assert.equal(state.batchCount, 1);
  assert.match(state.batchStatements[0].sql, /UPDATE staff_users SET/);
  assert.match(state.batchStatements[1].sql, /UPDATE staff_sessions SET revoked_at/);
  assert.match(state.batchStatements[2].sql, /staff.user_updated/);
});

test("staff cannot deactivate their own account", async () => {
  const token = "b".repeat(64);
  const actor = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const target = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", role: "manager", is_active: 1 };
  const { env, state } = createEnv({ firstResults: [actor, target] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff/" + target.id, {
      method: "PATCH",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_active: false })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "cannot_deactivate_self");
  assert.equal(state.batchCount, 0);
});

test("staff password reset revokes all active sessions and is audit logged", async () => {
  const token = "c".repeat(64);
  const actor = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const target = { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", role: "operator" };
  const { env, state } = createEnv({ firstResults: [actor, target], batchChanges: [1, 2, 1] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff/" + target.id + "/reset-password", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ new_password: "NewSecureOperatorPass123" })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.password_reset, true);
  assert.equal(body.sessions_revoked, true);
  assert.equal(state.batchCount, 1);
  assert.match(state.batchStatements[0].sql, /UPDATE staff_users SET password_hash/);
  assert.match(state.batchStatements[1].sql, /UPDATE staff_sessions SET revoked_at/);
  assert.match(state.batchStatements[2].sql, /staff.password_reset/);
});

test("manager cannot reset another manager password", async () => {
  const token = "d".repeat(64);
  const actor = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const target = { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", role: "manager" };
  const { env, state } = createEnv({ firstResults: [actor, target] });
  const response = await worker.fetch(
    request("/api/v1/admin/staff/" + target.id + "/reset-password", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ new_password: "AnotherSecureManagerPass12" })
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.batchCount, 0);
});


test("finance can read COD payment records without customer contact fields", async () => {
  const token = "c".repeat(64);
  const staff = { id: "finance-1", email: "finance@example.test", display_name: "Finance", role: "finance", is_active: 1 };
  const payments = [{ payment_id: "payment-1", order_number: "FRY-00001", order_status: "delivered", method: "cod", payment_status: "unpaid", amount_paisa: 72000 }];
  const { env, state } = createEnv({ firstResult: staff, allResults: payments });
  const response = await worker.fetch(
    request("/api/v1/admin/payments?status=unpaid", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.payments, payments);
  assert.match(state.lastSql, /p.method = 'cod'/);
  assert.doesNotMatch(state.lastSql, /customer_phone|delivery_address/);
});

test("operator cannot read payment records", async () => {
  const token = "d".repeat(64);
  const staff = { id: "operator-1", email: "operator@example.test", display_name: "Operator", role: "operator", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/payments", {
      headers: { Cookie: "__Host-fryzar_admin=" + token }
    }),
    env
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.allCount, 0);
});

test("finance can collect a delivered COD payment with atomic payment and audit records", async () => {
  const token = "e".repeat(64);
  const staff = { id: "finance-1", email: "finance@example.test", display_name: "Finance", role: "finance", is_active: 1 };
  const payment = {
    payment_id: "payment-1",
    payment_status: "unpaid",
    method: "cod",
    amount_paisa: 72000,
    order_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    order_number: "FRY-00001",
    order_status: "delivered",
    order_payment_status: "unpaid"
  };
  const { env, state } = createEnv({
    firstResults: [staff, null, payment],
    batchChanges: [0, 1, 1, 1, 1]
  });
  const response = await worker.fetch(
    request("/api/v1/admin/payments/cod-collection", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "cod-collection-test-0001",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id: payment.order_id })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.collected, true);
  assert.equal(body.payment_status, "collected");
  assert.equal(body.amount_paisa, 72000);
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 5);
  assert.match(state.batchStatements[1].sql, /UPDATE orders SET payment_status='collected'/);
  assert.match(state.batchStatements[2].sql, /UPDATE payments SET status='collected'/);
  assert.match(state.batchStatements[2].sql, /status='delivered' AND payment_status='collected'/);
  assert.match(state.batchStatements[3].sql, /payment.cod_collected/);
  assert.match(state.batchStatements[4].sql, /cod_collection/);
});

test("COD collection is rejected until the order is delivered", async () => {
  const token = "f".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const payment = {
    payment_id: "payment-2", payment_status: "unpaid", method: "cod", amount_paisa: 35000,
    order_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", order_number: "FRY-00002",
    order_status: "out_for_delivery", order_payment_status: "unpaid"
  };
  const { env, state } = createEnv({ firstResults: [staff, null, payment] });
  const response = await worker.fetch(
    request("/api/v1/admin/payments/cod-collection", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "cod-collection-test-0002",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id: payment.order_id })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "order_not_delivered");
  assert.equal(state.batchCount, 0);
});

test("COD collection rejects non-COD and already collected payments", async () => {
  const token = "1".repeat(64);
  const staff = { id: "owner-1", email: "owner@example.test", display_name: "Owner", role: "owner", is_active: 1 };
  const payment = {
    payment_id: "payment-3", payment_status: "unpaid", method: "manual_transfer", amount_paisa: 25000,
    order_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", order_number: "FRY-00003",
    order_status: "delivered", order_payment_status: "unpaid"
  };
  const { env, state } = createEnv({ firstResults: [staff, null, payment] });
  const response = await worker.fetch(
    request("/api/v1/admin/payments/cod-collection", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "cod-collection-test-0003",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id: payment.order_id })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "not_cod_payment");
  assert.equal(state.batchCount, 0);
});

test("COD collection requires an idempotency key", async () => {
  const token = "2".repeat(64);
  const staff = { id: "finance-1", email: "finance@example.test", display_name: "Finance", role: "finance", is_active: 1 };
  const { env, state } = createEnv({ firstResult: staff });
  const response = await worker.fetch(
    request("/api/v1/admin/payments/cod-collection", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" })
    }),
    env
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "idempotency_key_required");
  assert.equal(state.batchCount, 0);
});

test("COD collection replays a previously completed idempotent request", async () => {
  const token = "3".repeat(64);
  const staff = { id: "finance-1", email: "finance@example.test", display_name: "Finance", role: "finance", is_active: 1 };
  const orderId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const requestHash = createHash("sha256").update(JSON.stringify({ order_id: orderId })).digest("hex");
  const stored = {
    collected: true,
    order_id: orderId,
    order_number: "FRY-00004",
    payment_id: "payment-4",
    payment_status: "collected",
    amount_paisa: 42000
  };
  const existing = {
    request_hash: requestHash,
    response_json: JSON.stringify(stored),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  const { env, state } = createEnv({ firstResults: [staff, existing] });
  const response = await worker.fetch(
    request("/api/v1/admin/payments/cod-collection", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "cod-collection-replay-0001",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id: orderId })
    }),
    env
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Idempotent-Replay"), "true");
  assert.deepEqual(await response.json(), stored);
  assert.equal(state.batchCount, 0);
});

test("different idempotency payload cannot reuse a COD collection key", async () => {
  const token = "4".repeat(64);
  const staff = { id: "finance-1", email: "finance@example.test", display_name: "Finance", role: "finance", is_active: 1 };
  const requestHash = createHash("sha256").update(JSON.stringify({ order_id: "ffffffff-ffff-4fff-8fff-ffffffffffff" })).digest("hex");
  const existing = {
    request_hash: requestHash,
    response_json: JSON.stringify({ collected: true }),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
  const { env, state } = createEnv({ firstResults: [staff, existing] });
  const response = await worker.fetch(
    request("/api/v1/admin/payments/cod-collection", {
      method: "POST",
      headers: {
        Origin: "https://admin.example",
        Cookie: "__Host-fryzar_admin=" + token,
        "Idempotency-Key": "cod-collection-replay-0002",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order_id: "11111111-1111-4111-8111-111111111111" })
    }),
    env
  );

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "idempotency_key_reused");
  assert.equal(state.batchCount, 0);
});


test("admin dashboard metrics returns aggregate operational counts without customer details", async () => {
  const token = "8".repeat(64);
  const staff = { id: "manager-1", email: "manager@example.test", display_name: "Manager", role: "manager", is_active: 1 };
  const metrics = {
    total_orders: 12,
    open_orders: 3,
    delivered_orders: 8,
    delivered_revenue_paisa: 123450,
    unpaid_cod_count: 2,
    active_products: 14,
    low_stock_products: 4,
    active_categories: 5,
    active_delivery_zones: 3
  };
  const { env, state } = createEnv({ firstResults: [staff, metrics] });
  const response = await worker.fetch(request("/api/v1/admin/metrics", {
    headers: { Origin: "https://admin.example", Cookie: "__Host-fryzar_admin=" + token }
  }), env);

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).metrics, metrics);
  assert.equal(state.firstCount, 2);
  assert.match(state.lastSql, /delivered_revenue_paisa/);
  assert.doesNotMatch(state.lastSql, /customer_phone|delivery_address/);
  assert.doesNotMatch(JSON.stringify(metrics), /customer_phone|delivery_address/);
});

test("dashboard metrics are denied to rider accounts", async () => {
  const token = "9".repeat(64);
  const rider = { id: "rider-1", email: "rider@example.test", display_name: "Rider", role: "rider", is_active: 1 };
  const { env, state } = createEnv({ firstResult: rider });
  const response = await worker.fetch(request("/api/v1/admin/metrics", {
    headers: { Origin: "https://admin.example", Cookie: "__Host-fryzar_admin=" + token }
  }), env);

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "insufficient_permissions");
  assert.equal(state.firstCount, 1);
});
