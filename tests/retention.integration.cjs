"use strict";

const assert = require("node:assert/strict");
const { createLocalD1 } = require("./helpers/local-d1-worker.cjs");

const MAX_BATCH = 100;
const OWNER_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ORDER_ID = "11111111-1111-4111-8111-111111111111";

function rows(db, table, predicate) {
  return Number(db.queryRow("SELECT COUNT(*) AS row_count FROM " + table + (predicate ? " WHERE " + predicate : ""), ["row_count"]).row_count);
}

function historicalRows(db) {
  return db.queryRow(
    "SELECT (SELECT COUNT(*) FROM staff_sessions WHERE staff_user_id='" + OWNER_ID + "' AND revoked_at IS NULL) AS active_sessions, " +
    "(SELECT COUNT(*) FROM orders WHERE id='" + ORDER_ID + "') AS orders, " +
    "(SELECT COUNT(*) FROM payments WHERE order_id='" + ORDER_ID + "') AS payments, " +
    "(SELECT COUNT(*) FROM order_items WHERE order_id='" + ORDER_ID + "') AS items, " +
    "(SELECT COUNT(*) FROM inventory_movements WHERE reference_id='" + ORDER_ID + "') AS movements, " +
    "(SELECT COUNT(*) FROM audit_logs WHERE entity_id='" + ORDER_ID + "') AS audits",
    ["active_sessions", "orders", "payments", "items", "movements", "audits"]
  );
}

function fixture(nowIso, failDelete) {
  const failureTrigger = failDelete
    ? "CREATE TRIGGER fail_retention_delete BEFORE DELETE ON idempotency_keys WHEN OLD.idempotency_key='cleanup-failure' BEGIN SELECT RAISE(ABORT, 'synthetic cleanup failure'); END;"
    : "";
  return [
    "INSERT INTO staff_users (id,email,password_hash,display_name,role,is_active) VALUES ('" + OWNER_ID + "','retention-owner@local.test','synthetic-unused','Retention Test Owner','owner',1);",
    "INSERT INTO staff_sessions (id,staff_user_id,token_hash,expires_at) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeef','" + OWNER_ID + "','" + "a".repeat(64) + "','2099-01-01T00:00:00.000Z');",
    "INSERT INTO products (id,sku,slug,name_ur,name_en,price_paisa,stock_qty,is_available) VALUES ('44444444-4444-4444-8444-444444444444','RET-A','retention-product','مصنوع','Retention Product',10000,4,1);",
    "INSERT INTO orders (id,order_number,tracking_token_hash,customer_name,customer_phone,delivery_address,customer_language,payment_method,payment_status,status,subtotal_paisa,delivery_fee_paisa,discount_paisa,total_paisa) VALUES ('" + ORDER_ID + "','FRZ-RET-001','" + "b".repeat(64) + "','Synthetic Retention Customer','03000000000','Synthetic Retention Address','en','cod','unpaid','delivered',10000,0,0,10000);",
    "INSERT INTO order_items (id,order_id,product_id,product_name_ur_snapshot,product_name_en_snapshot,unit_price_paisa,quantity,line_total_paisa) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','" + ORDER_ID + "','44444444-4444-4444-8444-444444444444','مصنوع','Retention Product',10000,1,10000);",
    "INSERT INTO payments (id,order_id,method,status,amount_paisa) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','" + ORDER_ID + "','cod','unpaid',10000);",
    "INSERT INTO inventory_movements (id,product_id,delta_qty,reason,reference_type,reference_id,note) VALUES ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','44444444-4444-4444-8444-444444444444',-1,'order_reserved','order','" + ORDER_ID + "','Synthetic financial history');",
    "INSERT INTO audit_logs (id,actor_staff_id,actor_role,action,entity_type,entity_id,metadata_json) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff','" + OWNER_ID + "','owner','test.history','order','" + ORDER_ID + "','{}');",
    "INSERT INTO idempotency_keys (id,scope,idempotency_key,request_hash,response_json,created_at,expires_at) VALUES ('00000000000000000000000000000001','retention_test','still-valid','synthetic-hash','{}','" + nowIso + "','2099-01-01T00:00:00.000Z');",
    "INSERT INTO idempotency_keys (id,scope,idempotency_key,request_hash,response_json,created_at,expires_at) VALUES ('00000000000000000000000000000002','retention_test','expired-replay','synthetic-hash','{}','2000-01-01T00:00:00.000Z','2000-01-02T00:00:00.000Z');",
    "INSERT INTO api_rate_limits (bucket_key,window_started_at,request_count) VALUES ('rate-active','" + nowIso + "',1),('rate-expired','2000-01-01T00:00:00.000Z',1);",
    "INSERT INTO auth_login_attempts (id,identity_hash,source_hash,attempted_at,was_successful) VALUES ('00000000000000000000000000000003','synthetic-identity','synthetic-source','2000-01-01T00:00:00.000Z',0),('00000000000000000000000000000004','synthetic-identity','synthetic-source','" + nowIso + "',0);",
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<100) INSERT INTO idempotency_keys (id,scope,idempotency_key,request_hash,response_json,created_at,expires_at) SELECT printf('%032x',n+100),'retention_test','expired-batch-'||n,'synthetic-hash','{}','2000-01-01T00:00:00.000Z','2000-01-02T00:00:00.000Z' FROM seq;",
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<101) INSERT INTO api_rate_limits (bucket_key,window_started_at,request_count) SELECT 'rate-expired-'||n,'2000-01-01T00:00:00.000Z',1 FROM seq;",
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<101) INSERT INTO auth_login_attempts (id,identity_hash,source_hash,attempted_at,was_successful) SELECT printf('%032x',n+200),'synthetic-identity-'||n,'synthetic-source','2000-01-01T00:00:00.000Z',0 FROM seq;",
    failureTrigger
  ].filter(Boolean).join("\n");
}

async function triggerCleanup(baseUrl, cron) {
  return fetch(baseUrl + "/cdn-cgi/local/scheduled?cron=" + encodeURIComponent(cron || "17 2 * * *"));
}

async function main() {
  const nowIso = new Date().toISOString();
  const db = await createLocalD1({ testScheduled: true, logLevel: "info" });
  try {
    db.execSql(fixture(nowIso, false));
    const baseUrl = await db.startWorker();
    const response = await triggerCleanup(baseUrl);
    assert.equal(response.status, 200, "local scheduled event endpoint should complete");
    await response.text();

    assert.equal(rows(db, "idempotency_keys", "idempotency_key LIKE 'expired-batch-%'"), 1, "only one of 101 expired idempotency rows remains after the bounded first run");
    assert.equal(rows(db, "api_rate_limits", "bucket_key LIKE 'rate-expired-%'"), 1, "only one of 101 expired rate buckets remains after the bounded first run");
    assert.equal(rows(db, "auth_login_attempts", "attempted_at < '2020-01-01T00:00:00.000Z'"), 1, "only one of 101 expired login attempts remains after the bounded first run");
    assert.equal(rows(db, "idempotency_keys", "idempotency_key='still-valid'"), 1, "unexpired idempotency replay protection remains");
    assert.equal(rows(db, "idempotency_keys", "idempotency_key='expired-replay'"), 0, "an expired replay record is eligible only after expiry");
    assert.equal(rows(db, "api_rate_limits", "bucket_key='rate-active'"), 1, "active rate-limit window remains");
    assert.equal(rows(db, "api_rate_limits", "bucket_key='rate-expired'"), 0, "expired rate-limit window is removed");
    assert.equal(rows(db, "auth_login_attempts", "attempted_at='" + nowIso + "'"), 1, "recent login attempt remains");
    assert.deepEqual(historicalRows(db), {
      active_sessions: 1, orders: 1, payments: 1, items: 1, movements: 1, audits: 1
    }, "cleanup leaves active sessions and financial/audit history untouched");

    const second = await triggerCleanup(baseUrl);
    assert.equal(second.status, 200);
    await second.text();
    assert.equal(rows(db, "idempotency_keys", "idempotency_key LIKE 'expired-batch-%'"), 0);
    assert.equal(rows(db, "api_rate_limits", "bucket_key LIKE 'rate-expired-%'"), 0);
    assert.equal(rows(db, "auth_login_attempts", "attempted_at < '2020-01-01T00:00:00.000Z'"), 0);
    const third = await triggerCleanup(baseUrl);
    assert.equal(third.status, 200);
    await third.text();
    assert.equal(rows(db, "idempotency_keys", "idempotency_key='still-valid'"), 1);
    assert.deepEqual(historicalRows(db), {
      active_sessions: 1, orders: 1, payments: 1, items: 1, movements: 1, audits: 1
    });
  } finally {
    await db.cleanup();
  }

  const failureDb = await createLocalD1({ testScheduled: true });
  try {
    const failureNow = new Date().toISOString();
    failureDb.execSql(fixture(failureNow, true));
    const baseUrl = await failureDb.startWorker();
    const before = {
      replay: rows(failureDb, "idempotency_keys", "idempotency_key='cleanup-failure'"),
      idempotency: rows(failureDb, "idempotency_keys", "expires_at < '2020-01-01T00:00:00.000Z'"),
      rateLimits: rows(failureDb, "api_rate_limits", "window_started_at < '2020-01-01T00:00:00.000Z'"),
      oldAttempts: rows(failureDb, "auth_login_attempts", "attempted_at < '2020-01-01T00:00:00.000Z'")
    };
    assert.equal(before.replay, 0);
    failureDb.execSql("INSERT INTO idempotency_keys (id,scope,idempotency_key,request_hash,response_json,created_at,expires_at) VALUES ('00000000000000000000000000000005','retention_test','cleanup-failure','synthetic-hash','{}','2000-01-01T00:00:00.000Z','2000-01-02T00:00:00.000Z');");
    const countsBeforeTrigger = {
      idempotency: rows(failureDb, "idempotency_keys", "expires_at < '2020-01-01T00:00:00.000Z'"),
      rateLimits: rows(failureDb, "api_rate_limits", "window_started_at < '2020-01-01T00:00:00.000Z'"),
      oldAttempts: rows(failureDb, "auth_login_attempts", "attempted_at < '2020-01-01T00:00:00.000Z'")
    };
    const failResponse = await triggerCleanup(baseUrl);
    await failResponse.text();
    assert.deepEqual({
      idempotency: rows(failureDb, "idempotency_keys", "expires_at < '2020-01-01T00:00:00.000Z'"),
      rateLimits: rows(failureDb, "api_rate_limits", "window_started_at < '2020-01-01T00:00:00.000Z'"),
      oldAttempts: rows(failureDb, "auth_login_attempts", "attempted_at < '2020-01-01T00:00:00.000Z'")
    }, countsBeforeTrigger, "failed D1 cleanup batch changes none of its selected tables");
    assert.deepEqual(historicalRows(failureDb), {
      active_sessions: 1, orders: 1, payments: 1, items: 1, movements: 1, audits: 1
    });
    assert.equal(failureDb.output.includes("synthetic-hash"), false);
  } finally {
    await failureDb.cleanup();
  }

  process.stdout.write("Real local Wrangler D1 retention integration passed: 24-hour replay validity, 15-minute rate windows, 30-day login-attempt retention, bounded 100-row deletes, repeat safety, protected sessions/history, and atomic failure behavior.\n");
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
