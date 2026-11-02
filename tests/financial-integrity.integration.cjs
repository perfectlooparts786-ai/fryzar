"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createLocalD1, requestJson } = require("./helpers/local-d1-worker.cjs");

const OWNER_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ORDER_OK = "11111111-1111-4111-8111-111111111111";
const ORDER_FAIL = "22222222-2222-4222-8222-222222222222";
const ORDER_CANCELLED = "33333333-3333-4333-8333-333333333333";
const ORDER_NOT_DELIVERED = "44444444-4444-4444-8444-444444444444";
const ORDER_TRANSFER = "55555555-5555-4555-8555-555555555555";
const ORDER_MISMATCH = "66666666-6666-4666-8666-666666666666";

function financialState(db, orderId, key) {
  return db.queryRow(
    "SELECT o.status, o.payment_status AS order_payment, p.status AS payment_status, " +
    "(SELECT COUNT(*) FROM audit_logs WHERE action='payment.cod_collected' AND entity_id=p.id) AS audits, " +
    "(SELECT COUNT(*) FROM idempotency_keys WHERE scope='cod_collection' AND idempotency_key='" + key + "') AS idempotency_rows " +
    "FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id='" + orderId + "'",
    ["status", "order_payment", "payment_status", "audits", "idempotency_rows"]
  );
}

async function main() {
  const bootstrapToken = "local-only-financial-fixture-owner-bootstrap-token-64chars";
  const db = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: bootstrapToken } });
  try {
    const baseUrl = await db.startWorker();
    const bootstrapped = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": bootstrapToken },
      body: { email: "financial-owner@local.test", display_name: "Financial Fixture Owner", password: "SyntheticFinancialOwnerPassword!2026" }
    });
    assert.equal(bootstrapped.response.status, 201, "local fixture owner is created only in isolated D1");
    const cookie = (bootstrapped.response.headers.get("Set-Cookie") || "").match(/__Host-fryzar_admin=([a-f0-9]{64})/);
    assert.ok(cookie, "bootstrap issues a session cookie for the finance owner");
    const SESSION_TOKEN = cookie[1];
    const fixturePath = path.join(__dirname, "fixtures", "financial-integrity.sql");
    const fixture = fs.readFileSync(fixturePath, "utf8");
    db.execSql(fixture);

    const orderTotals = db.queryRow(
      "SELECT COUNT(*) AS invalid_totals FROM orders o WHERE " +
      "o.subtotal_paisa != COALESCE((SELECT SUM(i.line_total_paisa) FROM order_items i WHERE i.order_id=o.id),0) " +
      "OR o.total_paisa != o.subtotal_paisa + o.delivery_fee_paisa - o.discount_paisa " +
      "OR o.discount_paisa > o.subtotal_paisa + o.delivery_fee_paisa " +
      "OR o.total_paisa < 0",
      ["invalid_totals"]
    );
    assert.equal(Number(orderTotals.invalid_totals), 0, "populated fixtures reconcile line sums, fee, discount, and totals");

    const lineMath = db.queryRow(
      "SELECT COUNT(*) AS invalid_lines FROM order_items WHERE line_total_paisa != unit_price_paisa * quantity",
      ["invalid_lines"]
    );
    assert.equal(Number(lineMath.invalid_lines), 0);

    const itemDetail = db.queryRow(
      "SELECT SUM(line_total_paisa) AS subtotal, " +
      "(SELECT delivery_fee_paisa FROM orders WHERE id='" + ORDER_OK + "') AS fee, " +
      "(SELECT discount_paisa FROM orders WHERE id='" + ORDER_OK + "') AS discount, " +
      "(SELECT total_paisa FROM orders WHERE id='" + ORDER_OK + "') AS total " +
      "FROM order_items WHERE order_id='" + ORDER_OK + "'",
      ["subtotal", "fee", "discount", "total"]
    );
    assert.equal(Number(itemDetail.subtotal), 38500, "2×12,500 + 3×4,500 = 38,500 paisa");
    assert.equal(Number(itemDetail.fee), 3000);
    assert.equal(Number(itemDetail.discount), 2500);
    assert.equal(Number(itemDetail.total), 39000, "38,500 + 3,000 - 2,500 = 39,000 paisa");

    const amounts = db.queryRow(
      "SELECT SUM(CASE WHEN p.amount_paisa != o.total_paisa THEN 1 ELSE 0 END) AS mismatch_count, " +
      "SUM(CASE WHEN p.amount_paisa != o.total_paisa AND o.id='" + ORDER_MISMATCH + "' THEN 1 ELSE 0 END) AS intentional_mismatch " +
      "FROM payments p JOIN orders o ON o.id=p.order_id",
      ["mismatch_count", "intentional_mismatch"]
    );
    assert.equal(Number(amounts.mismatch_count), 1, "only the deliberately malformed fixture payment differs from payable total");
    assert.equal(Number(amounts.intentional_mismatch), 1);

    const reservation = db.queryRow(
      "SELECT (SELECT stock_qty FROM products WHERE id='44444444-4444-4444-8444-444444444444') AS stock_a, " +
      "(SELECT stock_qty FROM products WHERE id='33333333-3333-4333-8333-333333333333') AS stock_b, " +
      "(SELECT SUM(delta_qty) FROM inventory_movements WHERE reference_type='order' AND product_id='44444444-4444-4444-8444-444444444444') AS net_a, " +
      "(SELECT SUM(delta_qty) FROM inventory_movements WHERE reference_type='order' AND product_id='33333333-3333-4333-8333-333333333333') AS net_b",
      ["stock_a", "stock_b", "net_a", "net_b"]
    );
    assert.equal(Number(reservation.stock_a), 2);
    assert.equal(Number(reservation.stock_b), 5);
    assert.equal(Number(reservation.net_b), -3, "cancelled COD order retains reserve and restore movements without changing payment");
    const cancelled = db.queryRow(
      "SELECT o.payment_status AS order_payment, p.status AS payment_status " +
      "FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id='" + ORDER_CANCELLED + "'",
      ["order_payment", "payment_status"]
    );
    assert.equal(cancelled.order_payment, "unpaid");
    assert.equal(cancelled.payment_status, "unpaid");

    const collectionKey = "fin-collection-idem-0001";
    const collect = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": collectionKey },
      body: { order_id: ORDER_OK }
    });
    assert.equal(collect.response.status, 201);
    assert.equal(collect.body.amount_paisa, 39000);
    const collected = financialState(db, ORDER_OK, collectionKey);
    assert.equal(collected.status, "delivered");
    assert.equal(collected.order_payment, "collected");
    assert.equal(collected.payment_status, "collected");
    assert.equal(Number(collected.audits), 1);
    assert.equal(Number(collected.idempotency_rows), 1);

    const replay = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": collectionKey },
      body: { order_id: ORDER_OK }
    });
    assert.equal(replay.response.status, 200);
    assert.equal(replay.response.headers.get("Idempotent-Replay"), "true");
    assert.equal(Number(financialState(db, ORDER_OK, collectionKey).audits), 1);
    assert.equal(Number(financialState(db, ORDER_OK, collectionKey).idempotency_rows), 1);

    const duplicateWithNewKey = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": "fin-collection-idem-0002" },
      body: { order_id: ORDER_OK }
    });
    assert.equal(duplicateWithNewKey.response.status, 409, "second collection cannot duplicate an accepted payment");
    assert.equal(Number(financialState(db, ORDER_OK, collectionKey).audits), 1);

    const notDelivered = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": "fin-collection-idem-0003" },
      body: { order_id: ORDER_NOT_DELIVERED }
    });
    assert.equal(notDelivered.response.status, 409);

    const notCod = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": "fin-collection-idem-0004" },
      body: { order_id: ORDER_TRANSFER }
    });
    assert.equal(notCod.response.status, 409);

    const amountMismatch = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": "fin-collection-idem-0005" },
      body: { order_id: ORDER_MISMATCH }
    });
    assert.equal(amountMismatch.response.status, 409);
    assert.equal(amountMismatch.body.error, "payment_amount_mismatch");

    const rollbackKey = "fin-collection-idem-rollback";
    const beforeRollback = financialState(db, ORDER_FAIL, rollbackKey);
    const failed = await requestJson(baseUrl, "/api/v1/admin/payments/cod-collection", {
      method: "POST",
      cookie: SESSION_TOKEN,
      headers: { "Idempotency-Key": rollbackKey },
      body: { order_id: ORDER_FAIL }
    });
    assert.equal(failed.response.status, 409, "synthetic late audit failure is reported safely");
    assert.deepEqual(financialState(db, ORDER_FAIL, rollbackKey), beforeRollback, "D1 batch rollback leaves order, payment, audit, and idempotency unchanged");
    assert.equal(db.output.includes(SESSION_TOKEN), false);

    process.stdout.write("Real local Wrangler D1 financial integration passed: populated line/totals arithmetic, payment amount validation, COD collection/replay, invalid states, cancellation consistency, and atomic rollback.\n");
  } finally {
    await db.cleanup();
  }
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
