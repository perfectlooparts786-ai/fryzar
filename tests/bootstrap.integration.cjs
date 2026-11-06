"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createLocalD1, requestJson } = require("./helpers/local-d1-worker.cjs");

const BOOTSTRAP_TOKEN = "local-only-synthetic-owner-bootstrap-token-64-characters";
const PASSWORD = "SyntheticOwnerPassword!2026";
const ORIGIN = "http://localhost:5173";

function bootstrapBody(email, password = PASSWORD) {
  return { email, display_name: "Synthetic First Owner", password };
}

function countRow(db, where) {
  return db.queryRow(
    "SELECT COUNT(*) AS row_count FROM " + where,
    ["row_count"]
  );
}

async function main() {
  const raceDb = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: BOOTSTRAP_TOKEN } });
  try {
    const baseUrl = await raceDb.startWorker();

    const invalidOrigin = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: {
        Origin: "https://untrusted.invalid",
        "Content-Type": "application/json",
        "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN
      },
      body: bootstrapBody("origin-rejected@local.test")
    });
    assert.equal(invalidOrigin.response.status, 403);

    const invalidToken = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": "wrong-synthetic-token-value-000000000000000000" },
      body: bootstrapBody("token-rejected@local.test")
    });
    assert.equal(invalidToken.response.status, 403);

    const invalidPayload = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
      body: { email: "not-an-email", display_name: "x", password: "short" }
    });
    assert.equal(invalidPayload.response.status, 400);

    const attempts = await Promise.all([
      requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
        body: bootstrapBody("first-a@local.test")
      }),
      requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
        body: bootstrapBody("first-b@local.test")
      })
    ]);
    const winners = attempts.filter((item) => item.response.status === 201);
    const losers = attempts.filter((item) => item.response.status === 409);
    assert.equal(winners.length, 1, "the unique first_owner claim allows exactly one concurrent winner");
    assert.equal(losers.length, 1, "the losing atomic D1 batch is rejected without partial writes");
    assert.equal(winners[0].body.user.role, "owner");
    assert.equal(winners[0].body.authenticated, true);
    assert.equal(Object.hasOwn(winners[0].body.user, "password_hash"), false);
    assert.equal(JSON.stringify(winners[0].body).includes(PASSWORD), false);
    assert.equal(JSON.stringify(winners[0].body).includes(BOOTSTRAP_TOKEN), false);

    const cookie = winners[0].response.headers.get("Set-Cookie") || "";
    const tokenMatch = cookie.match(/__Host-fryzar_admin=([a-f0-9]{64})/);
    assert.ok(tokenMatch, "successful bootstrap returns the intended secure session cookie");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    const sessionHash = createHash("sha256").update(tokenMatch[1]).digest("hex");

    const state = raceDb.queryRow(
      "SELECT (SELECT COUNT(*) FROM staff_users) AS users, " +
      "(SELECT COUNT(*) FROM staff_users WHERE role='owner' AND is_active=1) AS owners, " +
      "(SELECT COUNT(*) FROM bootstrap_claims WHERE claim_key='first_owner') AS claims, " +
      "(SELECT COUNT(*) FROM staff_sessions) AS sessions, " +
      "(SELECT COUNT(*) FROM staff_sessions WHERE token_hash='" + sessionHash + "') AS hashed_session, " +
      "(SELECT COUNT(*) FROM audit_logs WHERE action='staff.owner_bootstrapped') AS audits, " +
      "(SELECT password_hash FROM staff_users WHERE role='owner' LIMIT 1) AS password_hash",
      ["users", "owners", "claims", "sessions", "hashed_session", "audits", "password_hash"]
    );
    assert.equal(Number(state.users), 1);
    assert.equal(Number(state.owners), 1);
    assert.equal(Number(state.claims), 1);
    assert.equal(Number(state.sessions), 1);
    assert.equal(Number(state.hashed_session), 1);
    assert.equal(Number(state.audits), 1);
    assert.match(state.password_hash, /^pbkdf2_sha256\$310000\$/);
    assert.notEqual(state.password_hash, PASSWORD);
    assert.equal(state.password_hash.includes(PASSWORD), false);

    const repeated = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
      body: bootstrapBody("replacement@local.test")
    });
    assert.equal(repeated.response.status, 409, "bootstrap cannot replace an existing owner or claim");
    assert.equal(Number(countRow(raceDb, "staff_users").row_count), 1);
    assert.equal(raceDb.output.includes(BOOTSTRAP_TOKEN), false);
    assert.equal(raceDb.output.includes(PASSWORD), false);
  } finally {
    await raceDb.cleanup();
  }

  const failureDb = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: BOOTSTRAP_TOKEN } });
  try {
    failureDb.execSql(
      "CREATE TRIGGER fail_bootstrap_audit BEFORE INSERT ON audit_logs " +
      "WHEN NEW.action='staff.owner_bootstrapped' " +
      "BEGIN SELECT RAISE(ABORT, 'synthetic bootstrap audit failure'); END;"
    );
    const baseUrl = await failureDb.startWorker();
    const failed = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
      body: bootstrapBody("rollback@local.test")
    });
    assert.equal(failed.response.status, 409);
    const rolledBack = failureDb.queryRow(
      "SELECT (SELECT COUNT(*) FROM bootstrap_claims) AS claims, " +
      "(SELECT COUNT(*) FROM staff_users) AS users, " +
      "(SELECT COUNT(*) FROM staff_sessions) AS sessions, " +
      "(SELECT COUNT(*) FROM audit_logs WHERE action='staff.owner_bootstrapped') AS audits",
      ["claims", "users", "sessions", "audits"]
    );
    assert.deepEqual(
      { claims: Number(rolledBack.claims), users: Number(rolledBack.users), sessions: Number(rolledBack.sessions), audits: Number(rolledBack.audits) },
      { claims: 0, users: 0, sessions: 0, audits: 0 },
      "failed late D1 statement rolls back the claim, owner, session, and audit"
    );
    assert.equal(failureDb.output.includes(BOOTSTRAP_TOKEN), false);
    assert.equal(failureDb.output.includes(PASSWORD), false);
  } finally {
    await failureDb.cleanup();
  }

  const existingOwnerDb = await createLocalD1({ vars: { OWNER_BOOTSTRAP_TOKEN: BOOTSTRAP_TOKEN } });
  try {
    existingOwnerDb.execSql(
      "INSERT INTO staff_users (id,email,password_hash,display_name,role,is_active) " +
      "VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','preexisting@local.test','synthetic-existing-hash','Existing Owner','owner',1)"
    );
    const baseUrl = await existingOwnerDb.startWorker();
    const blocked = await requestJson(baseUrl, "/api/v1/admin/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Owner-Bootstrap-Token": BOOTSTRAP_TOKEN },
      body: bootstrapBody("replacement-owner@local.test")
    });
    assert.equal(blocked.response.status, 409, "a pre-existing owner blocks first-owner bootstrap even if no claim row exists");
    assert.equal(Number(countRow(existingOwnerDb, "staff_users").row_count), 1);
    assert.equal(Number(countRow(existingOwnerDb, "bootstrap_claims").row_count), 0);
    assert.equal(Number(countRow(existingOwnerDb, "staff_sessions").row_count), 0);
    assert.equal(Number(countRow(existingOwnerDb, "audit_logs WHERE action='staff.owner_bootstrapped'").row_count), 0);
  } finally {
    await existingOwnerDb.cleanup();
  }

  process.stdout.write("Real local Wrangler D1 bootstrap integration passed: atomic concurrent single-winner claim, safe session/hash storage, validation, repeat rejection, and late-statement rollback.\n");
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
