"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const api = read("apps/api/wrangler.toml");
const customer = read("apps/customer-worker/wrangler.toml");
const admin = read("apps/admin-worker/wrangler.toml");

function hasExactLine(source, line) {
  return source.split(/\r?\n/).some((entry) => entry.trim() === line);
}

assert.ok(hasExactLine(api, 'name = "fryzar-api-preview"'), "API Worker must target preview");
assert.ok(hasExactLine(api, 'database_name = "fryzar-preview"'), "API D1 name must be preview");
assert.ok(
  hasExactLine(api, 'database_id = "a6f528a3-4b36-43a9-8e77-31f7105a4aeb"'),
  "API D1 UUID must match the approved preview database"
);
assert.ok(hasExactLine(api, 'APP_ENV = "preview"'), "API environment must be preview");

assert.ok(hasExactLine(customer, 'name = "fryzar-app-preview"'), "Customer Worker must target preview");
assert.ok(hasExactLine(customer, 'service = "fryzar-api-preview"'), "Customer service binding must target preview API");
assert.ok(hasExactLine(admin, 'name = "fryzar-admin-preview"'), "Admin Worker must target preview");
assert.ok(hasExactLine(admin, 'service = "fryzar-api-preview"'), "Admin service binding must target preview API");

const allConfigs = api + "\n" + customer + "\n" + admin;
const forbidden = [
  'name = "fryzar-api"',
  'name = "fryzar-app"',
  'name = "fryzar-admin"',
  'database_name = "fryzar-core"',
  'database_name = "fryzar-production"',
  'database_id = "880b9681-4252-4db0-be44-b60c4edbdc15"',
  'database_id = "098238a6-1bda-4735-8f21-d925c7fe32de"'
];
for (const line of forbidden) {
  assert.ok(!hasExactLine(allConfigs, line), "Production target is forbidden in development configs: " + line);
}

console.log("Preview configuration safety passed: API, customer and admin targets match the preview allowlist; no production target found.");
