"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const worker = require("../.test-build/api/index.js").default;

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function createEnv(options = {}) {
  const firstQueue = Array.isArray(options.firstResults) ? [...options.firstResults] : null;
  const allQueue = Array.isArray(options.allResultsQueue) ? [...options.allResultsQueue] : null;
  const state = { batchStatements: [] };

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
      state.batchStatements = statements.map((s) => ({ sql: s.sql, params: s.params }));
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

test("submitCustomerPaymentProof rejects proof when manual_transfer_enabled is false", async () => {
  const trackingToken = "c".repeat(64);
  const { env } = createEnv({
    firstResults: [
      { value_json: "false" } // manual_transfer_enabled
    ]
  });

  const res = await worker.fetch(request("/api/v1/orders/55555555-5555-4555-8555-555555555555/payment-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracking_token: trackingToken,
      private_object_key: "proofs/2026/11/transfer-01.png",
      original_filename: "receipt.png",
      detected_mime_type: "image/png",
      file_size_bytes: 204800
    })
  }), env);

  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "manual_transfer_disabled");
});

test("submitCustomerPaymentProof verifies tracking token and submits proof when manual transfer is enabled", async () => {
  const trackingToken = "d".repeat(64);
  const tokenHash = sha256Hex(trackingToken);
  const { env, state } = createEnv({
    firstResults: [
      { value_json: "true" }, // manual_transfer_enabled
      {
        id: "55555555-5555-4555-8555-555555555555",
        tracking_token_hash: tokenHash,
        payment_method: "manual_transfer",
        payment_id: "payment-101",
        method: "manual_transfer",
        status: "awaiting_proof"
      }
    ]
  });

  const res = await worker.fetch(request("/api/v1/orders/55555555-5555-4555-8555-555555555555/payment-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracking_token: trackingToken,
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
  assert.equal(state.batchStatements.length, 3);
});

test("submitCustomerPaymentProof blocks invalid tracking tokens and COD orders", async () => {
  const validToken = "e".repeat(64);
  const wrongToken = "f".repeat(64);
  const { env: wrongTokenEnv } = createEnv({
    firstResults: [
      { value_json: "true" },
      {
        id: "55555555-5555-4555-8555-555555555555",
        tracking_token_hash: sha256Hex(validToken),
        payment_method: "manual_transfer",
        payment_id: "payment-101",
        method: "manual_transfer",
        status: "awaiting_proof"
      }
    ]
  });

  const denied = await worker.fetch(request("/api/v1/orders/55555555-5555-4555-8555-555555555555/payment-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracking_token: wrongToken,
      private_object_key: "proofs/2026/11/transfer-02.png",
      original_filename: "receipt.png",
      detected_mime_type: "image/png",
      file_size_bytes: 10240
    })
  }), wrongTokenEnv);
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error, "invalid_tracking_token");

  const { env: codEnv } = createEnv({
    firstResults: [
      { value_json: "true" },
      {
        id: "55555555-5555-4555-8555-555555555555",
        tracking_token_hash: sha256Hex(validToken),
        payment_method: "cod",
        payment_id: "payment-102",
        method: "cod",
        status: "unpaid"
      }
    ]
  });

  const codRejected = await worker.fetch(request("/api/v1/orders/55555555-5555-4555-8555-555555555555/payment-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracking_token: validToken,
      private_object_key: "proofs/2026/11/transfer-03.png",
      original_filename: "receipt.png",
      detected_mime_type: "image/png",
      file_size_bytes: 10240
    })
  }), codEnv);
  assert.equal(codRejected.status, 409);
  assert.equal((await codRejected.json()).error, "not_manual_transfer");
});
