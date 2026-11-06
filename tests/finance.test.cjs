const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../.test-build/api/index.js").default;

function createEnv(options = {}) {
  const firstQueue = Array.isArray(options.firstResults) ? [...options.firstResults] : null;
  const allQueue = Array.isArray(options.allResultsQueue) ? [...options.allResultsQueue] : null;

  const DB = {
    prepare(sql) {
      return {
        sql,
        params: [],
        bind(...params) {
          this.params = params;
          return this;
        },
        async first() {
          if (firstQueue) return firstQueue.length ? firstQueue.shift() : null;
          return options.firstResult ?? null;
        },
        async all() {
          if (allQueue) return { results: allQueue.length ? allQueue.shift() : [] };
          return { results: options.allResults ?? [] };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        }
      };
    },
    async batch(statements) {
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
    }
  };
}

function request(path, init = {}) {
  return new Request("http://localhost:5173" + path, init);
}

test("submitCustomerPaymentProof submits proof metadata and updates payment status", async () => {
  const paymentRow = { id: "payment-101" };
  const { env } = createEnv({ firstResult: paymentRow });

  const res = await worker.fetch(request("/api/v1/orders/55555555-5555-4555-8555-555555555555/payment-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      private_object_key: "proofs/2026/11/transfer-01.png",
      original_filename: "receipt.png",
      detected_mime_type: "image/png",
      file_size_bytes: 204800
    })
  }), env);

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.submitted, true);
  assert.ok(body.proof_id);
});
