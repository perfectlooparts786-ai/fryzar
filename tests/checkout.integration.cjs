const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

const root = path.resolve(__dirname, "..");
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = path.join(root, "apps", "api", "wrangler.toml");
const fixture = path.join(__dirname, "fixtures", "checkout-integration.sql");

const zoneId = "55555555-5555-4555-8555-555555555555";
const stockedProductId = "44444444-4444-4444-8444-444444444444";
const rollbackProductId = "33333333-3333-4333-8333-333333333333";
const origin = "http://localhost:5173";
const testSecret = "ci-only-not-a-real-secret-and-never-use-in-production";

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
    throw new Error(
      "Wrangler command failed: " + args.join(" ") + "\n" + stdout + "\n" + stderr
    );
  }
}

function findRow(value, requiredKeys) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRow(item, requiredKeys);
      if (found) return found;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  if (requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return value;
  }

  for (const child of Object.values(value)) {
    const found = findRow(child, requiredKeys);
    if (found) return found;
  }
  return null;
}

function queryStats(persistTo) {
  const sql = [
    "(SELECT COUNT(*) FROM orders) AS order_count",
    "(SELECT COUNT(*) FROM payments) AS payment_count",
    "(SELECT COUNT(*) FROM order_items) AS item_count",
    "(SELECT COUNT(*) FROM inventory_movements WHERE reason = 'order_reserved') AS reservation_count",
    "(SELECT COUNT(*) FROM idempotency_keys WHERE scope = 'checkout') AS idempotency_count",
    "(SELECT stock_qty FROM products WHERE id = '" + stockedProductId + "') AS remaining_stock",
    "(SELECT stock_qty FROM products WHERE id = '" + rollbackProductId + "') AS rollback_stock"
  ].join(", ");

  const output = runWrangler([
    "d1", "execute", "fryzar-preview",
    "--local", "--persist-to", persistTo,
    "--config", config,
    "--command", "SELECT " + sql,
    "--json"
  ]);

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("Wrangler did not return JSON for D1 stats query:\n" + output);
  }

  const row = findRow(parsed, [
    "order_count", "payment_count", "item_count", "reservation_count",
    "idempotency_count", "remaining_stock", "rollback_stock"
  ]);
  if (!row) throw new Error("Could not find D1 stats row in Wrangler JSON:\n" + output);

  return {
    orders: Number(row.order_count),
    payments: Number(row.payment_count),
    items: Number(row.item_count),
    reservations: Number(row.reservation_count),
    idempotencyKeys: Number(row.idempotency_count),
    remainingStock: Number(row.remaining_stock),
    rollbackStock: Number(row.rollback_stock)
  };
}

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine an available local port");
  }
  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function payload(productId, quantity, notes = "") {
  return {
    customer_name: "FRYZAR Integration Test",
    customer_phone: "03001234567",
    delivery_address: "House 12, Integration Test Road",
    delivery_zone_id: zoneId,
    customer_language: "en",
    payment_method: "cod",
    notes,
    items: [{ product_id: productId, quantity }]
  };
}

async function placeOrder(baseUrl, body, key, ip) {
  const response = await fetch(baseUrl + "/api/v1/orders", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      "CF-Connecting-IP": ip
    },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  return {
    status: response.status,
    replay: response.headers.get("Idempotent-Replay"),
    body: result
  };
}

async function waitForWorker(server, baseUrl, output) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("Wrangler dev exited before becoming ready:\n" + output());
    }
    try {
      const response = await fetch(baseUrl + "/api/v1/health", {
        headers: { Origin: origin }
      });
      if (response.status === 200) {
        const body = await response.json();
        if (body.ok === true) return;
      }
    } catch {
      // The local worker has not opened its HTTP listener yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the local API Worker:\n" + output());
}

async function main() {
  if (!fs.existsSync(wrangler)) {
    throw new Error("Wrangler CLI was not installed at " + wrangler);
  }
  if (!fs.existsSync(config) || !fs.existsSync(fixture)) {
    throw new Error("API Wrangler config or integration fixture is missing");
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fryzar-checkout-d1-"));
  const persistTo = path.join(tempRoot, "d1-state");
  const envFile = path.join(tempRoot, ".dev.vars");
  fs.mkdirSync(persistTo);
  fs.writeFileSync(envFile, 'TRACKING_SECRET="' + testSecret + '"\n', { mode: 0o600 });

  let server;
  let serverOutput = "";
  const appendOutput = (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-12000);
  };

  try {
    runWrangler([
      "d1", "migrations", "apply", "fryzar-preview",
      "--local", "--persist-to", persistTo,
      "--config", config
    ]);
    runWrangler([
      "d1", "execute", "fryzar-preview",
      "--local", "--persist-to", persistTo,
      "--config", config, "--file", fixture
    ]);

    const port = await findFreePort();
    const baseUrl = "http://127.0.0.1:" + port;
    server = spawn(process.execPath, [
      wrangler, "dev",
      "--config", config,
      "--persist-to", persistTo,
      "--env-file", envFile,
      "--compatibility-date", "2026-10-30",
      "--ip", "127.0.0.1",
      "--port", String(port),
      "--log-level", "error"
    ], {
      cwd: root,
      env: { ...process.env, PATH: workerdBin + ";" + (process.env.PATH || ""), CI: "true" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", appendOutput);
    server.stderr.on("data", appendOutput);

    await waitForWorker(server, baseUrl, () => serverOutput);

    const parallelRequests = [0, 1, 2].map((index) => ({
      key: "ci-checkout-parallel-" + index + "-20261101",
      body: payload(stockedProductId, 2),
      ip: "127.0.0." + (index + 1)
    }));
    const parallelResults = await Promise.all(
      parallelRequests.map((item) => placeOrder(baseUrl, item.body, item.key, item.ip))
    );

    const successful = parallelResults
      .map((result, index) => ({ ...result, request: parallelRequests[index] }))
      .filter((result) => result.status === 201);
    const conflicts = parallelResults.filter((result) => result.status === 409);

    assert.equal(successful.length, 2, "exactly two orders should reserve four of five stock units");
    assert.equal(conflicts.length, 1, "the third concurrent order should be rejected");
    for (const result of successful) {
      assert.ok(result.body.order && result.body.order.id, "successful checkout must return an order");
      assert.match(result.body.tracking_token, /^[a-f0-9]{64}$/);
    }

    const afterParallel = queryStats(persistTo);
    assert.deepEqual(afterParallel, {
      orders: 2,
      payments: 2,
      items: 2,
      reservations: 2,
      idempotencyKeys: 2,
      remainingStock: 1,
      rollbackStock: 3
    });

    const firstSuccess = successful[0];
    const replay = await placeOrder(
      baseUrl,
      firstSuccess.request.body,
      firstSuccess.request.key,
      "127.0.0.10"
    );
    assert.equal(replay.status, 200, "same idempotency key and payload must replay");
    assert.equal(replay.replay, "true");
    assert.equal(replay.body.order.id, firstSuccess.body.order.id);

    const conflictReplay = await placeOrder(
      baseUrl,
      payload(stockedProductId, 2, "different payload"),
      firstSuccess.request.key,
      "127.0.0.11"
    );
    assert.equal(conflictReplay.status, 409, "same key with a different payload must conflict");
    assert.equal(conflictReplay.body.error, "idempotency_key_reused");

    const forcedFailure = await placeOrder(
      baseUrl,
      payload(rollbackProductId, 1, "force rollback"),
      "ci-checkout-forced-rollback-20261101",
      "127.0.0.12"
    );
    assert.equal(forcedFailure.status, 500, "late inventory ledger failure must reject checkout");

    const afterRollback = queryStats(persistTo);
    assert.deepEqual(afterRollback, {
      orders: 2,
      payments: 2,
      items: 2,
      reservations: 2,
      idempotencyKeys: 2,
      remainingStock: 1,
      rollbackStock: 3
    });

    process.stdout.write(
      "Local D1 checkout integration passed: concurrency, stock invariant, payment/order atomicity, " +
      "idempotent replay, payload conflict, and rollback after a forced late-statement failure.\n"
    );
  } finally {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => server.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000))
      ]);
    }
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
