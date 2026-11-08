"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../.test-build/api/index.js").default;

function createEnv(options = {}) {
  const firstQueue = Array.isArray(options.firstResults) ? [...options.firstResults] : null;
  const allQueue = Array.isArray(options.allResultsQueue) ? [...options.allResultsQueue] : null;
  const state = {
    prepareCount: 0,
    firstCount: 0,
    allCount: 0,
    batchCount: 0,
    batchStatements: []
  };

  const DB = {
    prepare(sql) {
      state.prepareCount += 1;
      return {
        sql,
        params: [],
        bind(...params) {
          this.params = params;
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
    },
    async batch(statements) {
      state.batchCount += 1;
      state.batchStatements = statements.map((s) => ({ sql: s.sql, params: s.params }));
      return statements.map((_, idx) => ({
        success: true,
        meta: { changes: Array.isArray(options.batchChanges) ? (options.batchChanges[idx] ?? 1) : 1 },
        results: []
      }));
    }
  };

  return {
    env: {
      DB,
      APP_ENV: options.appEnv ?? "test",
      ALLOWED_ORIGINS: "https://admin.example,http://localhost:5173",
      TRACKING_SECRET: "test-only-tracking-secret-at-least-32-bytes-long",
      OWNER_BOOTSTRAP_TOKEN: "test-owner-bootstrap-token-at-least-32-bytes"
    },
    state
  };
}

function req(path, init = {}) {
  return new Request("https://admin.example" + path, init);
}

const ownerUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@fryzar.test",
  display_name: "Owner",
  role: "owner",
  is_active: 1
};
const managerUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "manager@fryzar.test",
  display_name: "Manager",
  role: "manager",
  is_active: 1
};
const kitchenUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "kitchen@fryzar.test",
  display_name: "Kitchen",
  role: "kitchen",
  is_active: 1
};
const token = "a".repeat(64);

test("public sitemap.xml renders canonical product, category, and editorial URLs without private routes", async () => {
  const { env } = createEnv({
    allResultsQueue: [
      [{ setting_key: "canonical_domain", value_json: '"https://fryzar.com"' }],
      [{ slug: "burgers", updated_at: "2026-11-06T00:00:00Z" }],
      [{ slug: "zinger-crunch", updated_at: "2026-11-06T00:00:00Z" }],
      [{ slug: "lahori-crispy-chicken-guide", updated_at: "2026-11-06T00:00:00Z", published_at: "2026-11-06T00:00:00Z" }]
    ]
  });

  const res = await worker.fetch(req("/sitemap.xml"), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Type") || "", /application\/xml/);
  const xml = await res.text();
  assert.match(xml, /https:\/\/fryzar\.com\/categories\/burgers/);
  assert.match(xml, /https:\/\/fryzar\.com\/products\/zinger-crunch/);
  assert.match(xml, /https:\/\/fryzar\.com\/guides\/lahori-crispy-chicken-guide/);
  assert.doesNotMatch(xml, /\/track\//);
  assert.doesNotMatch(xml, /\/admin/);
});

test("robots.txt disallows indexing in preview and protects private routes in production", async () => {
  const preview = createEnv({
    appEnv: "preview",
    allResultsQueue: [[{ setting_key: "canonical_domain", value_json: '"https://fryzar.com"' }]]
  });
  const prevRes = await worker.fetch(req("/robots.txt"), preview.env);
  const prevTxt = await prevRes.text();
  assert.match(prevTxt, /Disallow: \/\n/);

  const prod = createEnv({
    appEnv: "production",
    allResultsQueue: [[
      { setting_key: "canonical_domain", value_json: '"https://fryzar.com"' },
      { setting_key: "robots_index_storefront", value_json: "true" }
    ]]
  });
  const prodRes = await worker.fetch(req("/robots.txt"), prod.env);
  const prodTxt = await prodRes.text();
  assert.match(prodTxt, /Allow: \//);
  assert.match(prodTxt, /Disallow: \/checkout/);
  assert.match(prodTxt, /Disallow: \/track/);
  assert.match(prodTxt, /Disallow: \/admin/);
});

test("public monetization-config defaults to disabled with full restricted page list", async () => {
  const { env } = createEnv({ firstResult: null });
  const res = await worker.fetch(req("/api/v1/monetization-config"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.monetization.masterEnabled, false);
  assert.equal(body.monetization.effectiveActive, false);
  assert.deepEqual(body.zones, []);
  assert.ok(body.restricted_pages.includes("checkout"));
  assert.ok(body.restricted_pages.includes("basket"));
  assert.ok(body.restricted_pages.includes("order-tracking"));
});

test("ad-events telemetry strictly rejects any payload containing customer PII keys", async () => {
  const { env } = createEnv();
  const res = await worker.fetch(req("/api/v1/ad-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slot_id: "home_below_hero",
      format: "banner",
      page_type: "home",
      event_type: "slot_rendered",
      customer_phone: "03001234567"
    })
  }), env);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "pii_prohibited_in_ad_telemetry");
});

test("checkout enforces server-side required modifier group constraints", async () => {
  const productId = "44444444-4444-4444-8444-444444444444";
  const zoneId = "55555555-5555-4555-8555-555555555555";
  const { env, state } = createEnv({
    firstResults: [
      null,
      { id: zoneId, name_ur: "زون", name_en: "Zone", delivery_fee_paisa: 15000, minimum_order_paisa: 10000 }
    ],
    allResultsQueue: [
      [
        { setting_key: "store_status", value_json: '"open"' },
        { setting_key: "launch_ready", value_json: "true" },
        { setting_key: "cod_enabled", value_json: "true" }
      ],
      [{ id: productId, sku: "SKU-1", name_ur: "برگر", name_en: "Burger", price_paisa: 50000, stock_qty: 10, is_available: 1 }],
      [{ product_id: productId, group_id: "77777777-7777-4777-8777-777777777777", min_selection: 1, max_selection: 1, is_required: 1 }]
    ]
  });

  const res = await worker.fetch(req("/api/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "modifier-required-check-0001"
    },
    body: JSON.stringify({
      customer_name: "Ali Khan",
      customer_phone: "03001234567",
      delivery_address: "House 12, Street 4, Model Town",
      delivery_zone_id: zoneId,
      customer_language: "en",
      payment_method: "cod",
      notes: "",
      items: [{ product_id: productId, quantity: 1 }]
    })
  }), env);

  assert.equal(res.status, 422);
  assert.equal((await res.json()).error, "modifier_selection_invalid");
  assert.equal(state.batchCount, 0);
});

test("advertising config blocks prohibited intrusive formats and non-owner mutations", async () => {
  const managerEnv = createEnv({ firstResult: managerUser });
  const denied = await worker.fetch(req("/api/v1/admin/advertising/config", {
    method: "PATCH",
    headers: {
      Origin: "https://admin.example",
      Cookie: "__Host-fryzar_admin=" + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ masterEnabled: false })
  }), managerEnv.env);
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error, "owner_permission_required");

  const ownerEnv = createEnv({ firstResult: ownerUser });
  const popunderRes = await worker.fetch(req("/api/v1/admin/advertising/config", {
    method: "PATCH",
    headers: {
      Origin: "https://admin.example",
      Cookie: "__Host-fryzar_admin=" + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      masterEnabled: true,
      formats: { popunder: true }
    })
  }), ownerEnv.env);
  assert.equal(popunderRes.status, 422);
  assert.equal((await popunderRes.json()).error, "prohibited_ad_format");
});

test("advertising zone activation requires real publisher zone ID and HTTPS script origin", async () => {
  const { env } = createEnv({ firstResult: ownerUser });
  const zoneUuid = "88888888-8888-4888-8888-888888888888";
  const badOrigin = await worker.fetch(req("/api/v1/admin/advertising/zones/" + zoneUuid, {
    method: "PUT",
    headers: {
      Origin: "https://admin.example",
      Cookie: "__Host-fryzar_admin=" + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      publisher_zone_id: "zone_12345",
      script_origin: "http://insecure.example.com/script.js",
      is_enabled: true
    })
  }), env);
  assert.equal(badOrigin.status, 400);
  assert.equal((await badOrigin.json()).error, "invalid_script_origin");

  const { env: env2 } = createEnv({ firstResult: ownerUser });
  const emptyZone = await worker.fetch(req("/api/v1/admin/advertising/zones/" + zoneUuid, {
    method: "PUT",
    headers: {
      Origin: "https://admin.example",
      Cookie: "__Host-fryzar_admin=" + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      publisher_zone_id: "",
      script_origin: "",
      is_enabled: true
    })
  }), env2);
  assert.equal(emptyZone.status, 422);
  assert.equal((await emptyZone.json()).error, "zone_credentials_missing");
});

test("advertising emergency kill-switch disables master switch and all ad zones atomically", async () => {
  const { env, state } = createEnv({
    firstResults: [
      ownerUser,
      { config_json: JSON.stringify({ masterEnabled: true, previewEnabled: true }) }
    ]
  });
  const res = await worker.fetch(req("/api/v1/admin/advertising/kill-switch", {
    method: "POST",
    headers: {
      Origin: "https://admin.example",
      Cookie: "__Host-fryzar_admin=" + token
    }
  }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.disabled, true);
  assert.equal(body.config.masterEnabled, false);
  assert.equal(state.batchCount, 1);
  assert.equal(state.batchStatements.length, 3);
});

test("product delete refuses deletion when order or movement history exists and advises archiving", async () => {
  const prodUuid = "99999999-9999-4999-8999-999999999999";
  const { env, state } = createEnv({
    firstResults: [ownerUser, { order_refs: 2, movement_refs: 1 }]
  });
  const res = await worker.fetch(req("/api/v1/admin/products/" + prodUuid, {
    method: "DELETE",
    headers: {
      Origin: "https://admin.example",
      Cookie: "__Host-fryzar_admin=" + token
    }
  }), env);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "product_has_history_archive_instead");
  assert.equal(state.batchCount, 0);
});

test("customers directory is restricted to owner and manager roles", async () => {
  const { env } = createEnv({ firstResult: kitchenUser });
  const denied = await worker.fetch(req("/api/v1/admin/customers", {
    headers: { Cookie: "__Host-fryzar_admin=" + token }
  }), env);
  assert.equal(denied.status, 403);
});
