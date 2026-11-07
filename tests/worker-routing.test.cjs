const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const customerWorkerPromise = import("../apps/customer-worker/src/index.mjs").then((m) => m.default);
const adminWorkerPromise = import("../apps/admin-worker/src/index.mjs").then((m) => m.default);

function createFetcher(label, status = 200) {
  const calls = [];
  return {
    calls,
    async fetch(request) {
      calls.push(request);
      return new Response(label, {
        status,
        headers: { "X-FRYZAR-ROUTE": label }
      });
    }
  };
}

test("customer Worker forwards API requests unchanged to the central API service", async () => {
  const worker = await customerWorkerPromise;
  const api = createFetcher("central-api", 201);
  const assets = createFetcher("customer-assets");
  const body = JSON.stringify({ customer_name: "Test", items: [] });
  const request = new Request("https://store.example/api/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://store.example",
      "Idempotency-Key": "test-key-1234567890"
    },
    body
  });

  const response = await worker.fetch(request, { API: api, ASSETS: assets });

  assert.equal(response.status, 201);
  assert.equal(await response.text(), "central-api");
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0], request);
  assert.equal(await api.calls[0].clone().text(), body);
  assert.equal(assets.calls.length, 0);
});

test("customer Worker forwards the /api root and preflight requests to the central API", async () => {
  const worker = await customerWorkerPromise;
  const api = createFetcher("central-api");
  const assets = createFetcher("customer-assets");

  const rootResponse = await worker.fetch(
    new Request("https://store.example/api"),
    { API: api, ASSETS: assets }
  );
  const preflight = new Request("https://store.example/api/v1/orders", {
    method: "OPTIONS",
    headers: {
      Origin: "https://store.example",
      "Access-Control-Request-Method": "POST"
    }
  });
  const preflightResponse = await worker.fetch(preflight, { API: api, ASSETS: assets });

  assert.equal(await rootResponse.text(), "central-api");
  assert.equal(await preflightResponse.text(), "central-api");
  assert.equal(api.calls.length, 2);
  assert.equal(api.calls[1], preflight);
  assert.equal(assets.calls.length, 0);
});

test("customer Worker forwards /sitemap.xml and /robots.txt to the central API", async () => {
  const worker = await customerWorkerPromise;
  const api = createFetcher("central-api", 200);
  const assets = createFetcher("customer-assets");

  const sitemapRes = await worker.fetch(new Request("https://store.example/sitemap.xml"), { API: api, ASSETS: assets });
  const robotsRes = await worker.fetch(new Request("https://store.example/robots.txt"), { API: api, ASSETS: assets });

  assert.equal(await sitemapRes.text(), "central-api");
  assert.equal(await robotsRes.text(), "central-api");
  assert.equal(api.calls.length, 2);
  assert.equal(assets.calls.length, 0);
});

test("customer Worker serves non-API routes from its static asset binding", async () => {
  const worker = await customerWorkerPromise;
  const api = createFetcher("central-api");
  const assets = createFetcher("customer-assets");
  const request = new Request("https://store.example/products/");

  const response = await worker.fetch(request, { API: api, ASSETS: assets });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "customer-assets");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.match(response.headers.get("Permissions-Policy") || "", /camera=\(\)/);
  assert.equal(assets.calls.length, 1);
  assert.equal(assets.calls[0], request);
  assert.equal(api.calls.length, 0);
});

test("admin Worker forwards API requests unchanged to the central API service", async () => {
  const worker = await adminWorkerPromise;
  const api = createFetcher("central-api", 200);
  const assets = createFetcher("admin-assets");
  const request = new Request("https://admin.example/api/v1/admin/session", {
    headers: { Origin: "https://admin.example" }
  });

  const response = await worker.fetch(request, { API: api, ASSETS: assets });

  assert.equal(await response.text(), "central-api");
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0], request);
  assert.equal(assets.calls.length, 0);
});

test("admin Worker serves its application shell and routes from static assets", async () => {
  const worker = await adminWorkerPromise;
  const api = createFetcher("central-api");
  const assets = createFetcher("admin-assets");
  const request = new Request("https://admin.example/orders/");

  const response = await worker.fetch(request, { API: api, ASSETS: assets });

  assert.equal(await response.text(), "admin-assets");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.match(response.headers.get("X-Robots-Tag") || "", /noindex/);
  assert.equal(assets.calls.length, 1);
  assert.equal(assets.calls[0], request);
  assert.equal(api.calls.length, 0);
});

test("preview Wrangler configs route API and crawl endpoints through the central API", () => {
  const customerConfig = fs.readFileSync(
    path.join(__dirname, "../apps/customer-worker/wrangler.toml"),
    "utf8"
  );
  const adminConfig = fs.readFileSync(
    path.join(__dirname, "../apps/admin-worker/wrangler.toml"),
    "utf8"
  );
  const apiConfig = fs.readFileSync(
    path.join(__dirname, "../apps/api/wrangler.toml"),
    "utf8"
  );

  assert.ok(customerConfig.includes('run_worker_first = ["/api", "/api/*", "/sitemap.xml", "/robots.txt"]'));
  assert.ok(customerConfig.includes('service = "fryzar-api-preview"'));
  assert.ok(adminConfig.includes('run_worker_first = ["/api", "/api/*"]'));
  assert.ok(adminConfig.includes('service = "fryzar-api-preview"'));

  assert.ok(apiConfig.includes('name = "fryzar-api-preview"'));
  assert.ok(apiConfig.includes('database_name = "fryzar-preview"'));
  assert.ok(!apiConfig.includes("fryzar-production"));
  assert.ok(!apiConfig.includes("fryzar-core"));
});
