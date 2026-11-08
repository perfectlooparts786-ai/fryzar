"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createLocalD1, requestJson } = require("./helpers/local-d1-worker.cjs");

const BOOTSTRAP_TOKEN = "local-only-synthetic-owner-bootstrap-token-64-characters";
const OWNER_PASSWORD = "SyntheticOwnerPassword!2026";
const STAFF_PASSWORD = "SyntheticStaffPassword!2026";
const RESET_PASSWORD = "SyntheticResetPassword!2026";
let ipSequence = 1;

function cookieFrom(result) {
  const raw = result.response.headers.get("Set-Cookie") || "";
  const match = raw.match(/__Host-fryzar_admin=([a-f0-9]{64})/);
  assert.ok(match, "expected a valid opaque admin session cookie");
  return { token: match[1], raw };
}

async function login(baseUrl, email, password) {
  const ip = "198.51.100." + String((ipSequence++ % 250) + 1);
  return requestJson(baseUrl, "/api/v1/admin/login", {
    method: "POST",
    ip,
    body: { email, password }
  });
}

async function createStaff(baseUrl, ownerCookie, role, email) {
  const result = await requestJson(baseUrl, "/api/v1/admin/staff", {
    method: "POST",
    cookie: ownerCookie,
    body: { email, display_name: "Synthetic " + role, role, password: STAFF_PASSWORD }
  });
  assert.equal(result.response.status, 201, "owner can create synthetic " + role);
  return result.body.id;
}

async function main() {
  const db = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: BOOTSTRAP_TOKEN } });
  try {
    const baseUrl = await db.startWorker();
    db.execSql(
      "INSERT INTO auth_login_attempts (id,identity_hash,source_hash,attempted_at,was_successful) " +
      "VALUES ('99999999-9999-4999-8999-999999999999','old-synthetic-identity','old-synthetic-source','2000-01-01T00:00:00.000Z',0)"
    );
    const bootstrapped = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
      body: { email: "session-owner@local.test", display_name: "Session Test Owner", password: OWNER_PASSWORD }
    });
    assert.equal(bootstrapped.response.status, 201);
    const bootstrapCookie = cookieFrom(bootstrapped).token;

    const invalidOrigin = await requestJson(baseUrl, "/api/v1/admin/login", {
      method: "POST",
      headers: { Origin: "https://untrusted.invalid", "Content-Type": "application/json" },
      body: { email: "session-owner@local.test", password: OWNER_PASSWORD }
    });
    assert.equal(invalidOrigin.response.status, 403);

    const unknown = await login(baseUrl, "missing@local.test", "WrongSyntheticPassword!2026");
    const wrong = await login(baseUrl, "session-owner@local.test", "WrongSyntheticPassword!2026");
    assert.equal(unknown.response.status, 401);
    assert.equal(wrong.response.status, 401);
    assert.deepEqual(unknown.body, wrong.body, "unknown identity and bad password share one generic failure");

    const ownerLogin = await login(baseUrl, "session-owner@local.test", OWNER_PASSWORD);
    assert.equal(ownerLogin.response.status, 200);
    const ownerSession = cookieFrom(ownerLogin);
    assert.match(ownerSession.raw, /HttpOnly/);
    assert.match(ownerSession.raw, /Secure/);
    assert.match(ownerSession.raw, /SameSite=Strict/);
    assert.match(ownerSession.raw, /Path=\//);

    const ownerSessionHash = createHash("sha256").update(ownerSession.token).digest("hex");
    const stored = db.queryRow(
      "SELECT token_hash, expires_at, revoked_at FROM staff_sessions WHERE token_hash='" + ownerSessionHash + "'",
      ["token_hash", "expires_at", "revoked_at"]
    );
    assert.equal(stored.token_hash, ownerSessionHash, "only the SHA-256 session token hash is persisted");
    assert.equal(stored.revoked_at, null);
    const sessionResponse = await requestJson(baseUrl, "/api/v1/admin/session", { cookie: ownerSession.token });
    assert.equal(sessionResponse.response.status, 200);
    assert.equal(sessionResponse.body.user.role, "owner");
    assert.equal(
      Number(db.queryRow("SELECT COUNT(*) AS retained FROM auth_login_attempts WHERE attempted_at='2000-01-01T00:00:00.000Z'", ["retained"]).retained),
      1,
      "login no longer performs an unbounded retention delete in the request batch"
    );

    for (const cookie of [undefined, "malformed", "e".repeat(64)]) {
      const unauthorized = await requestJson(baseUrl, "/api/v1/admin/session", { cookie });
      assert.equal(unauthorized.response.status, 401);
    }

    const logout = await requestJson(baseUrl, "/api/v1/admin/logout", { method: "POST", cookie: ownerSession.token });
    assert.equal(logout.response.status, 200);
    assert.match(logout.response.headers.get("Set-Cookie") || "", /Max-Age=0/);
    const loggedOut = db.queryRow(
      "SELECT COUNT(*) AS revoked FROM staff_sessions WHERE token_hash='" + ownerSessionHash + "' AND revoked_at IS NOT NULL",
      ["revoked"]
    );
    assert.equal(Number(loggedOut.revoked), 1);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/session", { cookie: ownerSession.token })).response.status, 401);

    const expiringLogin = await login(baseUrl, "session-owner@local.test", OWNER_PASSWORD);
    assert.equal(expiringLogin.response.status, 200);
    const expiring = cookieFrom(expiringLogin);
    const expiringHash = createHash("sha256").update(expiring.token).digest("hex");
    db.execSql("UPDATE staff_sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE token_hash='" + expiringHash + "'");
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/session", { cookie: expiring.token })).response.status, 401);

    const managerId = await createStaff(baseUrl, bootstrapCookie, "manager", "manager@local.test");
    const operatorId = await createStaff(baseUrl, bootstrapCookie, "operator", "operator@local.test");
    const kitchenId = await createStaff(baseUrl, bootstrapCookie, "kitchen", "kitchen@local.test");
    await createStaff(baseUrl, bootstrapCookie, "finance", "finance@local.test");
    const supportId = await createStaff(baseUrl, bootstrapCookie, "support", "support@local.test");

    const cashierAttempt = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST",
      cookie: bootstrapCookie,
      body: { email: "cashier@local.test", display_name: "Unsupported Cashier", role: "cashier", password: STAFF_PASSWORD }
    });
    assert.equal(cashierAttempt.response.status, 403, "cashier is not a schema-supported role and cannot be assigned");

    db.execSql(
      "INSERT INTO orders (id,order_number,tracking_token_hash,customer_name,customer_phone,delivery_address,delivery_area,customer_language,payment_method,payment_status,status,subtotal_paisa,delivery_fee_paisa,discount_paisa,total_paisa) " +
      "VALUES ('11111111-1111-4111-8111-111111111111','FRZ-SESSION-001','" + "1".repeat(64) + "','Private Synthetic Customer','03000000000','Private Synthetic Address','Local','en','cod','unpaid','pending',10000,0,0,10000)"
    );

    const kitchenLogin = await login(baseUrl, "kitchen@local.test", STAFF_PASSWORD);
    assert.equal(kitchenLogin.response.status, 200);
    const kitchenCookie = cookieFrom(kitchenLogin).token;
    const kitchenOrders = await requestJson(baseUrl, "/api/v1/admin/orders?limit=10&offset=0", { cookie: kitchenCookie });
    assert.equal(kitchenOrders.response.status, 200);
    assert.equal(kitchenOrders.body.orders[0].customer_name, null);
    assert.equal(kitchenOrders.body.orders[0].customer_phone, null);
    assert.equal(kitchenOrders.body.orders[0].delivery_address, null);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/payments", { cookie: kitchenCookie })).response.status, 403);

    const financeLogin = await login(baseUrl, "finance@local.test", STAFF_PASSWORD);
    assert.equal(financeLogin.response.status, 200);
    const financeCookie = cookieFrom(financeLogin).token;
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/payments", { cookie: financeCookie })).response.status, 200);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/orders?limit=10", { cookie: financeCookie })).response.status, 403);

    const managerLogin = await login(baseUrl, "manager@local.test", STAFF_PASSWORD);
    assert.equal(managerLogin.response.status, 200);
    const managerCookie = cookieFrom(managerLogin).token;
    const managerCannotAssignManager = await requestJson(baseUrl, "/api/v1/admin/staff", {
      method: "POST",
      cookie: managerCookie,
      body: { email: "second-manager@local.test", display_name: "Second Manager", role: "manager", password: STAFF_PASSWORD }
    });
    assert.equal(managerCannotAssignManager.response.status, 403);

    const managerDeactivated = await requestJson(baseUrl, "/api/v1/admin/staff/" + managerId, {
      method: "PATCH",
      cookie: bootstrapCookie,
      body: { is_active: false }
    });
    assert.equal(managerDeactivated.response.status, 200);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/session", { cookie: managerCookie })).response.status, 401);
    assert.equal((await login(baseUrl, "manager@local.test", STAFF_PASSWORD)).response.status, 401);

    const operatorLogin = await login(baseUrl, "operator@local.test", STAFF_PASSWORD);
    assert.equal(operatorLogin.response.status, 200);
    const operatorCookie = cookieFrom(operatorLogin).token;
    const roleChanged = await requestJson(baseUrl, "/api/v1/admin/staff/" + operatorId, {
      method: "PATCH",
      cookie: bootstrapCookie,
      body: { role: "finance" }
    });
    assert.equal(roleChanged.response.status, 200);
    assert.equal(roleChanged.body.sessions_revoked, true);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/session", { cookie: operatorCookie })).response.status, 401);
    const changedRoleLogin = await login(baseUrl, "operator@local.test", STAFF_PASSWORD);
    assert.equal(changedRoleLogin.response.status, 200);
    const changedRoleCookie = cookieFrom(changedRoleLogin).token;
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/payments", { cookie: changedRoleCookie })).response.status, 200);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/orders?limit=10", { cookie: changedRoleCookie })).response.status, 403);

    const supportLogin = await login(baseUrl, "support@local.test", STAFF_PASSWORD);
    assert.equal(supportLogin.response.status, 200);
    const supportCookie = cookieFrom(supportLogin).token;
    const reset = await requestJson(baseUrl, "/api/v1/admin/staff/" + supportId + "/reset-password", {
      method: "POST",
      cookie: bootstrapCookie,
      body: { new_password: RESET_PASSWORD }
    });
    assert.equal(reset.response.status, 200);
    assert.equal(reset.body.sessions_revoked, true);
    assert.equal((await requestJson(baseUrl, "/api/v1/admin/session", { cookie: supportCookie })).response.status, 401);
    assert.equal((await login(baseUrl, "support@local.test", STAFF_PASSWORD)).response.status, 401);
    assert.equal((await login(baseUrl, "support@local.test", RESET_PASSWORD)).response.status, 200);

    const beforeFailure = db.queryRow("SELECT COUNT(*) AS sessions FROM staff_sessions", ["sessions"]);
    db.execSql(
      "CREATE TRIGGER fail_login_audit BEFORE INSERT ON audit_logs " +
      "WHEN NEW.action='staff.login' " +
      "BEGIN SELECT RAISE(ABORT, 'synthetic login batch failure'); END;"
    );
    const failedLogin = await login(baseUrl, "session-owner@local.test", OWNER_PASSWORD);
    assert.equal(failedLogin.response.status, 500, "D1 login batch failure fails closed");
    assert.equal(failedLogin.body.error, "internal_error");
    const afterFailure = db.queryRow("SELECT COUNT(*) AS sessions FROM staff_sessions", ["sessions"]);
    assert.equal(Number(afterFailure.sessions), Number(beforeFailure.sessions), "failed login batch must not leave a session row");
    assert.equal(db.output.includes(BOOTSTRAP_TOKEN), false);
    assert.equal(db.output.includes(OWNER_PASSWORD), false);
    assert.equal(db.output.includes(STAFF_PASSWORD), false);
    assert.equal(db.output.includes(RESET_PASSWORD), false);
  } finally {
    await db.cleanup();
  }

  process.stdout.write("Real local Wrangler D1 session integration passed: login, generic failure, secure hashed sessions, expiry, logout, deactivation, password reset, role changes, PII projections, authorization boundaries, and fail-closed batch behavior.\n");
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
