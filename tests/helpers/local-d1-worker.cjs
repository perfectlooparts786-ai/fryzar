"use strict";

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

const ROOT = path.resolve(__dirname, "../..");
const WRANGLER = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
const CONFIG = path.join(ROOT, "apps", "api", "wrangler.toml");
const DATABASE = "fryzar-preview";
const ORIGIN = "http://localhost:5173";

const WORKERD_BIN = path.join(ROOT, "node_modules", "@cloudflare", "workerd-windows-64", "bin");

function runWrangler(args, persistTo) {
  if (args.includes("--remote") || !args.includes("--local")) {
    throw new Error("Local D1 safety guard rejected Wrangler arguments.");
  }
  if (!fs.existsSync(WRANGLER) || !fs.existsSync(CONFIG)) {
    throw new Error("Local Wrangler/config missing; refusing to use remote D1.");
  }
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return execFileSync(process.execPath, [WRANGLER, ...args], {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: WORKERD_BIN + ";" + (process.env.PATH || ""),
          CI: "true",
          CLOUDFLARE_API_TOKEN: "",
          CLOUDFLARE_API_KEY: "",
          CLOUDFLARE_ACCOUNT_ID: ""
        },
        maxBuffer: 10 * 1024 * 1024
      });
    } catch (error) {
      const stdout = typeof error.stdout === "string" ? error.stdout : "";
      const stderr = typeof error.stderr === "string" ? error.stderr : "";
      lastError = new Error("Wrangler local command failed: " + args.join(" ") + "\n" + stdout + "\n" + stderr);
      const combined = stdout + "\n" + stderr;
      const isTransientLock = /internal error|SQLITE_BUSY|database is locked/i.test(combined);
      if (!isTransientLock || attempt === 3) {
        throw lastError;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350 * (attempt + 1));
    }
  }
  throw lastError;
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
  if (keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return value;
  for (const entry of Object.values(value)) {
    const row = findRow(entry, keys);
    if (row) return row;
  }
  return null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("No local port available"));
        return;
      }
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function createLocalD1(options = {}) {
  const tempBase = path.join(ROOT, ".tmp");
  if (!fs.existsSync(tempBase)) fs.mkdirSync(tempBase, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(tempBase, "fryzar-local-d1-"));
  const persistTo = path.join(tempRoot, "state");
  fs.mkdirSync(persistTo);
  const envFile = path.join(tempRoot, ".dev.vars");
  const vars = Object.assign({
    APP_ENV: "test",
    TRACKING_SECRET: "local-only-synthetic-tracking-secret-32-bytes",
    OWNER_BOOTSTRAP_TOKEN: "local-only-synthetic-owner-bootstrap-token-64-characters"
  }, options.vars || {});
  const envContents = Object.entries(vars).map(([key, value]) => key + "=" + JSON.stringify(value)).join("\n") + "\n";
  fs.writeFileSync(envFile, envContents, { mode: 0o600 });
  try { fs.chmodSync(envFile, 0o600); } catch { /* Windows may not expose POSIX mode bits. */ }

  const db = {
    tempRoot,
    persistTo,
    envFile,
    server: null,
    output: "",
    applyMigrations() {
      return runWrangler(["d1", "migrations", "apply", DATABASE, "--local", "--persist-to", persistTo, "--config", CONFIG], persistTo);
    },
    execSql(sql) {
      const file = path.join(tempRoot, "sql-" + String(Date.now()) + "-" + Math.random().toString(16).slice(2) + ".sql");
      fs.writeFileSync(file, sql, { mode: 0o600 });
      try { return runWrangler(["d1", "execute", DATABASE, "--local", "--persist-to", persistTo, "--config", CONFIG, "--file", file], persistTo); }
      finally { fs.rmSync(file, { force: true }); }
    },
    queryRow(sql, keys, targetPersistTo = persistTo) {
      const output = runWrangler(["d1", "execute", DATABASE, "--local", "--persist-to", targetPersistTo, "--config", CONFIG, "--command", sql, "--json"], targetPersistTo);
      let parsed;
      try { parsed = JSON.parse(output); } catch { throw new Error("Wrangler local D1 query returned invalid JSON."); }
      const row = findRow(parsed, keys);
      if (!row) throw new Error("Expected local D1 query row was absent.");
      return row;
    },
    snapshotTo(destination) {
      if (fs.existsSync(destination)) throw new Error("Snapshot destination must not already exist.");
      fs.cpSync(persistTo, destination, { recursive: true, errorOnExist: true, force: false });
      return destination;
    },
    async startWorker() {
      const port = await freePort();
      const relEnvFile = path.relative(ROOT, envFile).replace(/\\/g, "/");
      const args = [WRANGLER, "dev", "--local", "--config", CONFIG, "--persist-to", persistTo, "--env-file", relEnvFile, "--compatibility-date", "2026-10-30", "--ip", "127.0.0.1", "--port", String(port), "--log-level", options.logLevel || "error"];
      for (const [key, value] of Object.entries(vars)) {
        args.push("--var", `${key}:${value}`);
      }
      if (options.testScheduled) args.push("--test-scheduled");
      this.server = spawn(process.execPath, args, {
        cwd: ROOT,
        env: {
          ...process.env,
          PATH: WORKERD_BIN + ";" + (process.env.PATH || ""),
          CI: "true",
          CLOUDFLARE_API_TOKEN: "",
          CLOUDFLARE_API_KEY: "",
          CLOUDFLARE_ACCOUNT_ID: ""
        },
        stdio: ["ignore", "pipe", "pipe"]
      });
      const append = (chunk) => { this.output = (this.output + chunk.toString()).slice(-16000); };
      this.server.stdout.on("data", append);
      this.server.stderr.on("data", append);
      const baseUrl = "http://127.0.0.1:" + port;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (this.server.exitCode !== null) throw new Error("Local API Worker exited:\n" + this.output);
        try {
          const response = await fetch(baseUrl + "/api/v1/health", { headers: { Origin: ORIGIN } });
          if (response.status === 200) return baseUrl;
        } catch { /* Wrangler is still opening the local listener. */ }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Timed out waiting for local API Worker:\n" + this.output);
    },
    async stopWorker() {
      if (this.server && this.server.exitCode === null) {
        const pid = this.server.pid;
        if (process.platform === "win32" && pid) {
          try {
            execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
          } catch { /* Process may have already exited. */ }
        } else {
          this.server.kill("SIGTERM");
        }
        await Promise.race([
          new Promise((resolve) => this.server.once("exit", resolve)),
          new Promise((resolve) => setTimeout(resolve, 5000))
        ]);
        this.server = null;
      }
    },
    async cleanup() {
      await this.stopWorker();
      fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  };

  try {
    runWrangler(["d1", "migrations", "apply", DATABASE, "--local", "--persist-to", persistTo, "--config", CONFIG], persistTo);
  } catch (error) {
    await db.cleanup();
    throw error;
  }
  return db;
}

async function requestJson(baseUrl, pathname, options = {}) {
  const headers = Object.assign({ Origin: ORIGIN }, options.headers || {});
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.cookie) headers.Cookie = "__Host-fryzar_admin=" + options.cookie;
  if (options.ip) headers["CF-Connecting-IP"] = options.ip;
  const response = await fetch(baseUrl + pathname, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  let body = null;
  try { body = await response.json(); } catch { /* Non-JSON response is retained as null. */ }
  return { response, body };
}

module.exports = { ROOT, CONFIG, DATABASE, ORIGIN, createLocalD1, requestJson, findRow };
