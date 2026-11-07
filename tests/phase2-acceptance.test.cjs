"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../.test-build/api/index.js").default;

function createEnv(options = {}) {
  const firstQueue = Array.isArray(options.firstResults) ? [...options.firstResults] : null;
  const allQueue = Array.isArray(options.allResultsQueue) ? [...options.allResultsQueue] : null;
  const state = {
    batchCount: 0,
    batchStatements: [],
    lastPreparedParams: []
  };

  const DB = {
    prepare(sql) {
      return {
        sql,
        params: [],
        bind(...params) {
          this.params = params;
          state.lastPreparedParams.push({ sql, params });
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
      state.batchCount += 1;
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
      APP_ENV: options.appEnv ?? "preview",
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

const token = "a".repeat(64);
const authHeaders = {
  Origin: "https://admin.example",
  Cookie: "__Host-fryzar_admin=" + token,
  "Content-Type": "application/json"
};

const staffByRole = (role, idSuffix = "1") => ({
  id: `${idSuffix.repeat(8)}-1111-4111-8111-${idSuffix.repeat(12)}`,
  email: `${role}@fryzar.test`,
  display_name: role.toUpperCase(),
  role,
  is_active: 1
});

test("cumulative refund ceiling blocks over-refunding and keeps order/payment statuses reconciled", async () => {
  const orderId = "44444444-4444-4444-8444-444444444444";
  const financeUser = staffByRole("finance", "2");

  // 1. Over-refund rejected with 422 when 30,000 paisa already refunded out of 50,000 paisa total
  const overEnv = createEnv({
    firstResults: [
      financeUser,
      {
        id: orderId,
        total_paisa: 50000,
        payment_method: "cod",
        payment_status: "collected",
        payment_id: "pay-1",
        refunded_paisa: 30000
      }
    ]
  });

  const overRes = await worker.fetch(req(`/api/v1/admin/orders/${orderId}/refund`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ amount_paisa: 25000, reason: "Excessive partial refund" })
  }), overEnv.env);

  assert.equal(overRes.status, 422);
  const overBody = await overRes.json();
  assert.equal(overBody.error, "refund_exceeds_order_total");
  assert.equal(overBody.remaining_refundable_paisa, 20000);
  assert.equal(overEnv.state.batchCount, 0);

  // 2. Partial refund records ledger + audit without creating order/payment status mismatch
  const partialEnv = createEnv({
    firstResults: [
      financeUser,
      {
        id: orderId,
        total_paisa: 50000,
        payment_method: "cod",
        payment_status: "collected",
        payment_id: "pay-1",
        refunded_paisa: 0
      }
    ]
  });

  const partialRes = await worker.fetch(req(`/api/v1/admin/orders/${orderId}/refund`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ amount_paisa: 20000, reason: "Missing dip cup" })
  }), partialEnv.env);

  assert.equal(partialRes.status, 201);
  const partialBody = await partialRes.json();
  assert.equal(partialBody.fully_refunded, false);
  assert.equal(partialBody.remaining_refundable_paisa, 30000);
  assert.equal(partialEnv.state.batchStatements.length, 3, "refund + ledger + audit only");

  // 3. Final full refund updates BOTH orders.payment_status and payments.status to 'refunded'
  const fullEnv = createEnv({
    firstResults: [
      financeUser,
      {
        id: orderId,
        total_paisa: 50000,
        payment_method: "cod",
        payment_status: "collected",
        payment_id: "pay-1",
        refunded_paisa: 20000
      }
    ]
  });

  const fullRes = await worker.fetch(req(`/api/v1/admin/orders/${orderId}/refund`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ amount_paisa: 30000, reason: "Remaining order refund" })
  }), fullEnv.env);

  assert.equal(fullRes.status, 201);
  const fullBody = await fullRes.json();
  assert.equal(fullBody.fully_refunded, true);
  assert.equal(fullBody.remaining_refundable_paisa, 0);
  assert.equal(fullEnv.state.batchStatements.length, 5, "refund + ledger + audit + orders update + payments update");
  assert.ok(fullEnv.state.batchStatements.some((s) => s.sql.includes("UPDATE orders SET payment_status = 'refunded'")));
  assert.ok(fullEnv.state.batchStatements.some((s) => s.sql.includes("UPDATE payments SET status = 'refunded'")));
});

test("kitchen staff can log product/ingredient wastage with stock deduction but cannot create suppliers", async () => {
  const kitchenUser = staffByRole("kitchen", "3");
  const prodUuid = "66666666-6666-4666-8666-666666666666";

  // Kitchen allowed on POST /api/v1/admin/wastage and deducts tracked product stock + inventory_movements
  const wastageEnv = createEnv({
    firstResults: [
      kitchenUser,
      { id: prodUuid, stock_qty: 12 }
    ]
  });

  const wastageRes = await worker.fetch(req("/api/v1/admin/wastage", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      product_id: prodUuid,
      quantity: 2,
      reason: "spilled",
      cost_paisa: 45000,
      note: "Dropped tray in kitchen"
    })
  }), wastageEnv.env);

  assert.equal(wastageRes.status, 201);
  assert.equal(wastageEnv.state.batchCount, 1);
  assert.ok(wastageEnv.state.batchStatements.some((s) => s.sql.includes("UPDATE products SET stock_qty = stock_qty - ?1")));
  assert.ok(wastageEnv.state.batchStatements.some((s) => s.sql.includes("INSERT INTO inventory_movements")));
  assert.ok(wastageEnv.state.batchStatements.some((s) => s.sql.includes("'wastage.logged'")));

  // Kitchen denied on POST /api/v1/admin/suppliers
  const supplierEnv = createEnv({ firstResult: kitchenUser });
  const supplierRes = await worker.fetch(req("/api/v1/admin/suppliers", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Unauthorized Supplier" })
  }), supplierEnv.env);
  assert.equal(supplierRes.status, 403);
});

test("rider horizontal isolation prevents updating another rider's assignment and blocks kitchen delivery updates", async () => {
  const assignmentUuid = "77777777-7777-4777-8777-777777777777";
  const riderA = staffByRole("rider", "4");
  const riderB = staffByRole("rider", "5");
  const kitchenUser = staffByRole("kitchen", "3");

  // Kitchen cannot mark a rider delivery assignment delivered
  const kitchenEnv = createEnv({ firstResult: kitchenUser });
  const kitchenDenied = await worker.fetch(req(`/api/v1/admin/deliveries/${assignmentUuid}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "delivered" })
  }), kitchenEnv.env);
  assert.equal(kitchenDenied.status, 403);

  // Rider A cannot update an assignment owned by Rider B
  const crossRiderEnv = createEnv({
    firstResults: [
      riderA,
      {
        id: assignmentUuid,
        order_id: "88888888-8888-4888-8888-888888888888",
        rider_id: "rider-rec-b",
        status: "assigned",
        staff_user_id: riderB.id
      }
    ]
  });
  const crossDenied = await worker.fetch(req(`/api/v1/admin/deliveries/${assignmentUuid}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "picked_up" })
  }), crossRiderEnv.env);
  assert.equal(crossDenied.status, 403);

  // Rider A CAN update their own assignment
  const ownRiderEnv = createEnv({
    firstResults: [
      riderA,
      {
        id: assignmentUuid,
        order_id: "88888888-8888-4888-8888-888888888888",
        rider_id: "rider-rec-a",
        status: "assigned",
        staff_user_id: riderA.id
      }
    ]
  });
  const ownAllowed = await worker.fetch(req(`/api/v1/admin/deliveries/${assignmentUuid}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "picked_up" })
  }), ownRiderEnv.env);
  assert.equal(ownAllowed.status, 200);
});

test("advertising overview returns complete MonetizationConfig contract and supports canonical placement_slot updates", async () => {
  const ownerUser = staffByRole("owner", "1");
  const overviewEnv = createEnv({
    firstResults: [ownerUser, null],
    allResultsQueue: [[], [], [], [], []]
  });

  const ovRes = await worker.fetch(req("/api/v1/admin/advertising/overview", {
    headers: { Cookie: "__Host-fryzar_admin=" + token }
  }), overviewEnv.env);
  assert.equal(ovRes.status, 200);
  const ovBody = await ovRes.json();
  assert.equal(ovBody.config.masterEnabled, false);
  assert.deepEqual(ovBody.config.devices, { mobile: true, desktop: true });
  assert.equal(ovBody.config.pages.editorial, true);
  assert.equal(ovBody.config.formats.nativeBanner, false);
  assert.equal(ovBody.config.formats.popunder, false);
  assert.equal(ovBody.config.frequencyCapPerSession, 4);

  const zoneUuid = "99999999-9999-4999-8999-999999999999";
  const zoneEnv = createEnv({ firstResult: ownerUser });
  const badSlotRes = await worker.fetch(req(`/api/v1/admin/advertising/zones/${zoneUuid}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      publisher_zone_id: "",
      script_origin: "",
      placement_slot: "checkout_header_illegal",
      is_enabled: false,
      status_note: ""
    })
  }), zoneEnv.env);
  assert.equal(badSlotRes.status, 400);
  assert.equal((await badSlotRes.json()).error, "invalid_placement_slot");

  const validSlotEnv = createEnv({ firstResult: ownerUser });
  const okSlotRes = await worker.fetch(req(`/api/v1/admin/advertising/zones/${zoneUuid}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      publisher_zone_id: "",
      script_origin: "",
      placement_slot: "editorial_in_article",
      is_enabled: false,
      status_note: "Mapped to canonical slot"
    })
  }), validSlotEnv.env);
  assert.equal(okSlotRes.status, 200);
});
