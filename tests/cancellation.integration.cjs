const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

const root = path.resolve(__dirname, "..");
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = path.join(root, "apps", "api", "wrangler.toml");
const origin = "http://localhost:5173";
const token = "a".repeat(64);
const tokenHash = createHash("sha256").update(token).digest("hex");
const managerId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const orderId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const failureOrderId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const deliveredOrderId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
const rejectedOrderId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc4";
const productA = "44444444-4444-4444-8444-444444444444";
const productB = "33333333-3333-4333-8333-333333333333";
const zoneId = "55555555-5555-4555-8555-555555555555";

const workerdBin = path.join(root, "node_modules", "@cloudflare", "workerd-windows-64", "bin");

function runWrangler(args) {
  try {
    return execFileSync(process.execPath, [wrangler, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: workerdBin + ";" + (process.env.PATH || ""), CI: "true" },
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (error) {
    const stdout = typeof error.stdout === "string" ? error.stdout : "";
    const stderr = typeof error.stderr === "string" ? error.stderr : "";
    throw new Error("Wrangler failed: " + args.join(" ") + "\n" + stdout + "\n" + stderr);
  }
}

function findRow(value, keys) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const row = findRow(entry, keys);
      if (row) return row;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (keys.every((key) => Object.hasOwn(value, key))) return value;
  for (const entry of Object.values(value)) {
    const row = findRow(entry, keys);
    if (row) return row;
  }
  return null;
}

function queryRow(persistTo, sql, keys) {
  const output = runWrangler([
    "d1", "execute", "fryzar-preview", "--local", "--persist-to", persistTo,
    "--config", config, "--command", sql, "--json"
  ]);
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("Wrangler did not return JSON for a local D1 read.");
  }
  const row = findRow(parsed, keys);
  if (!row) throw new Error("Expected local D1 aggregate row was absent.");
  return row;
}

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No local port available");
  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForWorker(server, baseUrl, getOutput) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error("Local API Worker exited:\n" + getOutput());
    try {
      const response = await fetch(baseUrl + "/api/v1/health", { headers: { Origin: origin } });
      if (response.status === 200) return;
    } catch {
      // Wrangler has not opened its local listener yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for local API Worker:\n" + getOutput());
}

async function cancel(baseUrl, id, cookie = token) {
  const headers = { Origin: origin, "Content-Type": "application/json" };
  if (cookie) headers.Cookie = "__Host-fryzar_admin=" + cookie;
  const response = await fetch(baseUrl + "/api/v1/admin/orders/" + id + "/status", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "cancelled", note: "Synthetic D1 cancellation test" })
  });
  return { status: response.status, body: await response.json() };
}

function fixtureSql() {
  const now = new Date().toISOString().replace(/'/g, "''");
  return `
INSERT INTO staff_users (id,email,password_hash,display_name,role,is_active) VALUES
('${managerId}','manager@local.test','synthetic-not-used-for-login','Local Test Manager','manager',1);
INSERT INTO staff_sessions (id,staff_user_id,token_hash,expires_at)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeef','${managerId}','${tokenHash}','2099-01-01T00:00:00.000Z');

INSERT INTO orders (id,order_number,tracking_token_hash,customer_name,customer_phone,delivery_address,delivery_area,delivery_zone_id,customer_language,payment_method,payment_status,status,subtotal_paisa,delivery_fee_paisa,discount_paisa,total_paisa,created_at,updated_at)
VALUES
('${orderId}','FRZ-CANCEL-001','${"1".repeat(64)}','Synthetic Customer','03000000000','Synthetic Test Street','Local','${zoneId}','en','cod','unpaid','pending',47000,25000,0,72000,'${now}','${now}'),
('${failureOrderId}','FRZ-CANCEL-002','${"2".repeat(64)}','Synthetic Customer','03000000000','Synthetic Test Street','Local','${zoneId}','en','cod','unpaid','pending',15000,25000,0,40000,'${now}','${now}'),
('${deliveredOrderId}','FRZ-CANCEL-003','${"3".repeat(64)}','Synthetic Customer','03000000000','Synthetic Test Street','Local','${zoneId}','en','cod','unpaid','delivered',15000,25000,0,40000,'${now}','${now}'),
('${rejectedOrderId}','FRZ-CANCEL-004','${"4".repeat(64)}','Synthetic Customer','03000000000','Synthetic Test Street','Local','${zoneId}','en','cod','unpaid','rejected',15000,25000,0,40000,'${now}','${now}');

INSERT INTO order_items (id,order_id,product_id,product_name_ur_snapshot,product_name_en_snapshot,sku_snapshot,unit_price_paisa,quantity,line_total_paisa) VALUES
('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','${orderId}','${productA}','مصنوع','Test A','CI-STOCK-5',15000,2,30000),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd2','${orderId}','${productB}','مصنوع','Test B','CI-ROLLBACK-3',17000,1,17000),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd3','${failureOrderId}','${productA}','مصنوع','Test A','CI-STOCK-5',15000,1,15000),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd4','${deliveredOrderId}','${productA}','مصنوع','Test A','CI-STOCK-5',15000,1,15000),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd5','${rejectedOrderId}','${productA}','مصنوع','Test A','CI-STOCK-5',15000,1,15000);

INSERT INTO payments (id,order_id,method,status,amount_paisa) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','${orderId}','cod','unpaid',72000),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','${failureOrderId}','cod','unpaid',40000),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3','${deliveredOrderId}','cod','unpaid',40000),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4','${rejectedOrderId}','cod','unpaid',40000);

INSERT INTO order_status_events (id,order_id,old_status,new_status,actor_type,note) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','${orderId}',NULL,'pending','customer','Synthetic order created'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','${failureOrderId}',NULL,'pending','customer','Synthetic order created'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','${deliveredOrderId}',NULL,'delivered','system','Synthetic delivered state'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','${rejectedOrderId}',NULL,'rejected','system','Synthetic rejected state');

UPDATE products SET stock_qty=0 WHERE id='${productA}';
UPDATE products SET stock_qty=2 WHERE id='${productB}';

INSERT INTO inventory_movements (id,product_id,delta_qty,reason,reference_type,reference_id,note) VALUES
('99999999-9999-4999-8999-999999999991','${productA}',-2,'order_reserved','order','${orderId}','Synthetic reservation'),
('99999999-9999-4999-8999-999999999992','${productB}',-1,'order_reserved','order','${orderId}','Synthetic reservation'),
('99999999-9999-4999-8999-999999999993','${productA}',-1,'order_reserved','order','${failureOrderId}','Synthetic reservation'),
('99999999-9999-4999-8999-999999999994','${productA}',-1,'order_reserved','order','${deliveredOrderId}','Synthetic reservation'),
('99999999-9999-4999-8999-999999999995','${productA}',-1,'order_reserved','order','${rejectedOrderId}','Synthetic reservation');

CREATE TRIGGER force_cancel_audit_failure
BEFORE INSERT ON audit_logs
WHEN NEW.action='order.status_changed' AND NEW.entity_id='${failureOrderId}'
BEGIN SELECT RAISE(ABORT,'forced_cancel_audit_failure'); END;
`;
}

async function main() {
  if (!fs.existsSync(wrangler) || !fs.existsSync(config)) {
    throw new Error("Local Wrangler/config missing; refusing to use any remote D1.");
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fryzar-cancel-d1-"));
  const persistTo = path.join(tempRoot, "state");
  const envFile = path.join(tempRoot, ".dev.vars");
  const fixture = path.join(tempRoot, "cancellation-fixture.sql");
  fs.mkdirSync(persistTo);
  fs.writeFileSync(envFile, 'TRACKING_SECRET="local-only-synthetic-test-secret-32-bytes-minimum"\n', { mode: 0o600 });
  fs.writeFileSync(fixture, fixtureSql(), { mode: 0o600 });

  let server;
  let output = "";
  const append = chunk => { output = (output + chunk.toString()).slice(-10000); };
  try {
    runWrangler(["d1","migrations","apply","fryzar-preview","--local","--persist-to",persistTo,"--config",config]);
    runWrangler(["d1","execute","fryzar-preview","--local","--persist-to",persistTo,"--config",config,"--file",path.join(__dirname,"fixtures","cancellation-integration.sql")]);
    const fixtureParts = fixtureSql().split(/;(?=\s*(?:INSERT|UPDATE|CREATE)\b)/).map(part => part.trim()).filter(Boolean);
    for (let index = 0; index < fixtureParts.length; index += 1) {
      try {
        runWrangler(["d1","execute","fryzar-preview","--local","--persist-to",persistTo,"--config",config,"--command",fixtureParts[index]]);
      } catch (error) {
        throw new Error("Synthetic cancellation fixture statement " + (index + 1) + " failed: " + error.message);
      }
    }

    const port = await findFreePort();
    const baseUrl = "http://127.0.0.1:" + port;
    server = spawn(process.execPath,[wrangler,"dev","--local","--config",config,"--persist-to",persistTo,"--env-file",envFile,"--compatibility-date","2026-10-30","--ip","127.0.0.1","--port",String(port),"--log-level","error"],{
      cwd:root,env:{...process.env,PATH:workerdBin+";"+(process.env.PATH||""),CI:"true"},stdio:["ignore","pipe","pipe"]
    });
    server.stdout.on("data",append);
    server.stderr.on("data",append);
    await waitForWorker(server,baseUrl,()=>output);

    const unauth=await cancel(baseUrl,orderId,null);
    assert.equal(unauth.status,401,"unauthenticated cancellation is rejected");

    const concurrent=await Promise.all([cancel(baseUrl,orderId),cancel(baseUrl,orderId)]);
    const accepted=concurrent.filter(result=>result.status===200);
    const rejected=concurrent.filter(result=>result.status===409||result.status===403);
    assert.equal(accepted.length,1,"exactly one cancellation transition is accepted; responses=" + JSON.stringify(concurrent));
    assert.equal(rejected.length,1,"the racing request is safely rejected");
    assert.equal(accepted[0].body.status,"cancelled");

    let row=queryRow(persistTo,`SELECT
      (SELECT status FROM orders WHERE id='${orderId}') AS order_status,
      (SELECT stock_qty FROM products WHERE id='${productA}') AS stock_a,
      (SELECT stock_qty FROM products WHERE id='${productB}') AS stock_b,
      (SELECT COUNT(*) FROM inventory_movements WHERE reference_id='${orderId}' AND reason='order_cancelled' AND product_id='${productA}') AS movement_a,
      (SELECT COUNT(*) FROM inventory_movements WHERE reference_id='${orderId}' AND reason='order_cancelled' AND product_id='${productB}') AS movement_b,
      (SELECT COUNT(*) FROM order_status_events WHERE order_id='${orderId}' AND new_status='cancelled') AS cancelled_events,
      (SELECT COUNT(*) FROM audit_logs WHERE entity_id='${orderId}' AND action='order.status_changed') AS audit_events,
      (SELECT COUNT(*) FROM payments WHERE order_id='${orderId}' AND method='cod' AND status='unpaid' AND amount_paisa=72000) AS unchanged_payment,
      (SELECT COUNT(*) FROM order_items WHERE order_id='${orderId}') AS item_count`,
      ["order_status","stock_a","stock_b","movement_a","movement_b","cancelled_events","audit_events","unchanged_payment","item_count"]);
    assert.equal(row.order_status,"cancelled");
    assert.equal(Number(row.stock_a),2,"two reserved units restored once; other synthetic orders retain their reservations");
    assert.equal(Number(row.stock_b),3,"one reserved unit restored once");
    assert.equal(Number(row.movement_a),1);
    assert.equal(Number(row.movement_b),1);
    assert.equal(Number(row.cancelled_events),1);
    assert.equal(Number(row.audit_events),1);
    assert.equal(Number(row.unchanged_payment),1,"cancellation does not invent refund/payment behavior");
    assert.equal(Number(row.item_count),2);

    const repeated=await cancel(baseUrl,orderId);
    assert.equal(repeated.status,403,"already-cancelled order cannot transition again");
    row=queryRow(persistTo,`SELECT (SELECT stock_qty FROM products WHERE id='${productA}') AS stock_a,
      (SELECT stock_qty FROM products WHERE id='${productB}') AS stock_b,
      (SELECT COUNT(*) FROM inventory_movements WHERE reference_id='${orderId}' AND reason='order_cancelled') AS movement_count`,
      ["stock_a","stock_b","movement_count"]);
    assert.equal(Number(row.stock_a),2);
    assert.equal(Number(row.stock_b),3);
    assert.equal(Number(row.movement_count),2);

    for (const invalidId of [deliveredOrderId,rejectedOrderId]) {
      const response=await cancel(baseUrl,invalidId);
      assert.equal(response.status,403,"delivered/rejected order cannot be cancelled");
    }

    const before=queryRow(persistTo,`SELECT
      (SELECT status FROM orders WHERE id='${failureOrderId}') AS order_status,
      (SELECT stock_qty FROM products WHERE id='${productA}') AS stock_a,
      (SELECT COUNT(*) FROM inventory_movements WHERE reference_id='${failureOrderId}' AND reason='order_cancelled') AS movements,
      (SELECT COUNT(*) FROM order_status_events WHERE order_id='${failureOrderId}') AS events,
      (SELECT COUNT(*) FROM audit_logs WHERE entity_id='${failureOrderId}' AND action='order.status_changed') AS audits`,
      ["order_status","stock_a","movements","events","audits"]);
    const failed=await cancel(baseUrl,failureOrderId);
    assert.equal(failed.status,409,"forced late audit failure returns a conflict");
    const after=queryRow(persistTo,`SELECT
      (SELECT status FROM orders WHERE id='${failureOrderId}') AS order_status,
      (SELECT stock_qty FROM products WHERE id='${productA}') AS stock_a,
      (SELECT COUNT(*) FROM inventory_movements WHERE reference_id='${failureOrderId}' AND reason='order_cancelled') AS movements,
      (SELECT COUNT(*) FROM order_status_events WHERE order_id='${failureOrderId}') AS events,
      (SELECT COUNT(*) FROM audit_logs WHERE entity_id='${failureOrderId}' AND action='order.status_changed') AS audits`,
      ["order_status","stock_a","movements","events","audits"]);
    assert.deepEqual(after,before,"failed D1 batch leaves order, inventory, movement, event, and audit unchanged");

    process.stdout.write("Local Wrangler D1 cancellation integration passed: concurrent winner, exactly-once stock/movement, status/audit consistency, invalid/repeated transitions, and atomic rollback.\n");
  } finally {
    if (server && server.exitCode===null) {
      server.kill("SIGTERM");
      await Promise.race([new Promise(resolve=>server.once("exit",resolve)),new Promise(resolve=>setTimeout(resolve,5000))]);
    }
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

main().catch(error=>{process.stderr.write((error&&error.stack)||String(error));process.exitCode=1;});
