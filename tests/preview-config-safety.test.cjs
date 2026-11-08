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

// Verify explicit gated production configs stay isolated in *.production.toml and bind to fryzar-core (v9 target)
const prodApi = read("apps/api/wrangler.production.toml");
const prodCustomer = read("apps/customer-worker/wrangler.production.toml");
const prodAdmin = read("apps/admin-worker/wrangler.production.toml");

assert.ok(hasExactLine(prodApi, 'name = "fryzar-api"'), "Production API config must target fryzar-api");
assert.ok(hasExactLine(prodApi, 'APP_ENV = "production"'), "Production API config must set APP_ENV = production");
assert.ok(hasExactLine(prodApi, 'database_name = "fryzar-core"'), "Production API config must bind fryzar-core");
assert.ok(hasExactLine(prodApi, 'database_id = "098238a6-1bda-4735-8f21-d925c7fe32de"'), "Production API config must match fryzar-core UUID");
assert.ok(!hasExactLine(prodApi, 'database_id = "880b9681-4252-4db0-be44-b60c4edbdc15"'), "Legacy fryzar-production must remain untouched as read-only source");

assert.ok(hasExactLine(prodCustomer, 'name = "fryzar-app"'), "Production customer Worker must target fryzar-app");
assert.ok(hasExactLine(prodCustomer, 'service = "fryzar-api"'), "Production customer Worker must bind fryzar-api");
assert.ok(prodCustomer.includes('pattern = "fryzar.com", custom_domain = true'), "Customer config must attach fryzar.com custom domain");
assert.ok(prodCustomer.includes('pattern = "www.fryzar.com", custom_domain = true'), "Customer config must attach www.fryzar.com custom domain");

assert.ok(hasExactLine(prodAdmin, 'name = "fryzar-admin"'), "Production admin Worker must target fryzar-admin");
assert.ok(hasExactLine(prodAdmin, 'service = "fryzar-api"'), "Production admin Worker must bind fryzar-api");
assert.ok(prodAdmin.includes('pattern = "admin.fryzar.com", custom_domain = true'), "Admin config must attach admin.fryzar.com custom domain");

assert.ok(prodApi.includes('pattern = "api.fryzar.com", custom_domain = true'), "API config must attach api.fryzar.com custom domain");

console.log("Preview & production configuration safety passed: default wrangler.toml targets preview only, and isolated *.production.toml targets fryzar-core cleanly with custom domain routes.");
