const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../.test-build/api/index.js").default;

function createEnv(options = {}) {
  const state = {
    prepareCount: 0,
    lastSql: "",
    lastParams: [],
    firstCount: 0,
    allCount: 0
  };

  const DB = {
    prepare(sql) {
      state.prepareCount += 1;
      state.lastSql = sql;
      const statement = {
        bind(...params) {
          state.lastParams = params;
          return this;
        },
        async first() {
          state.firstCount += 1;
          if (options.throwDb) throw new Error("private test database error");
          return options.firstResult ?? null;
        },
        async all() {
          state.allCount += 1;
          if (options.throwDb) throw new Error("private test database error");
          return { results: options.allResults ?? [] };
        }
      };
      return statement;
    }
  };

  return {
    env: {
      DB,
      APP_ENV: "test",
      ALLOWED_ORIGINS: "https://store.example,https://admin.example"
    },
    state
  };
}

function request(path, init = {}) {
  return new Request("https://api.example" + path, init);
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
