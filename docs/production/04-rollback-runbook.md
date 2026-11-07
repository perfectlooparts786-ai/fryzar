# FRYZAR — Production Rollback & Containment Runbook

**Document ID:** `04-ROLLBACK-RUNBOOK`  
**Status:** Verified & Ready for Production Operations  
**Cloudflare Account ID:** `234b20e49261c7a002f63b129e985563`

---

## 1. Rollback Decision Matrix

Choose the **minimum blast-radius containment action** that resolves the incident safely:

| Symptom / Failure Mode | Recommended Immediate Action | Target RTO | Data Loss Risk |
| --- | --- | --- | --- |
| Third-party Adsterra script latency, broken layout, or bad creative | Trigger **Adsterra Emergency Kill-Switch** (`POST /api/v1/admin/advertising/kill-switch`) | `< 30 sec` | None |
| Kitchen overload, rider shortage, or menu price error | Pause ordering via **Owner Launch Gate** (`POST /api/v1/admin/store/launch-gate` `{ "action": "pause" }`) | `< 30 sec` | None (in-flight orders & tracking remain live) |
| Frontend UI regression in Storefront or Admin SPA | Roll back `fryzar-app` or `fryzar-admin` Worker version (`wrangler rollback`) | `< 2 min` | None |
| API regression with backward-compatible D1 schema | Roll back `fryzar-api` Worker version (`wrangler rollback`) | `< 2 min` | None |
| Custom domain / DNS routing issue on `fryzar.com` | Detach Worker Custom Domain or pause route while keeping `*.workers.dev` operational | `< 3 min` | None |
| Failed cutover migration on `fryzar-core` before live orders | Restore `fryzar-core` via D1 Time Travel bookmark + roll back `fryzar-api`, `fryzar-app`, `fryzar-admin` to pre-cutover baseline versions | `< 5 min` | None (legacy `fryzar-production` was never modified) |

---

## 2. Pre-Cutover Baseline Versions (Recorded 2026-11-07)

Before any production deployment is authorized, these live production Worker versions and bindings were forensically captured:

| Production Worker | Pre-Cutover Version ID | Deployed Timestamp | Pre-Cutover D1 Binding |
| --- | --- | --- | --- |
| `fryzar-api` | `c0f0ecf8-97ef-4768-a947-f3f56be0df8e` | `2026-11-01T02:25:06.153Z` | `DB -> fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`) |
| `fryzar-app` | `91fdf9ab-ae00-4928-b5be-a1a356cc0f19` | `2026-10-31T16:31:07.503Z` | `DB -> fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) |
| `fryzar-admin` | `80b357d6-e6ea-49a7-a6bb-0802f7b88084` | `2026-10-31T16:29:10.909Z` | `DB -> fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) |

---

## 3. Tier 1 — Operational Soft Rollbacks (Zero Redeploy)

### 3.1 Pause Customer Checkout Immediately (Preserve Tracking & Admin)
From Admin Portal -> **Settings -> Launch & Ordering Gate -> Pause New Orders**, or via authenticated Owner API call:
```bash
curl -X POST "https://admin.fryzar.com/api/v1/admin/store/launch-gate" \
  -H "Origin: https://admin.fryzar.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: __Host-fryzar_admin=<OWNER_SESSION_TOKEN>" \
  -d '{"action":"pause","reason":"Emergency operational pause"}'
```
Effect: `store_status` becomes `"paused"`, `launch_ready` becomes `false`, `POST /api/v1/checkout` immediately returns `503 store_unavailable`, while `/track/:token` and admin order fulfillment continue uninterrupted.

### 3.2 Adsterra Emergency Kill-Switch
From Admin Portal -> **Adsterra Monetization -> Emergency Kill-Switch**, or via Owner API call:
```bash
curl -X POST "https://admin.fryzar.com/api/v1/admin/advertising/kill-switch" \
  -H "Origin: https://admin.fryzar.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: __Host-fryzar_admin=<OWNER_SESSION_TOKEN>" \
  -d '{"reason":"Emergency monetization disable"}'
```
Effect: Atomically sets `adsterra_kill_switch = true`, `adsterra_enabled = false`, and `ad_zones.is_active = 0` for every zone in one D1 batch. Zero third-party ad scripts load on any storefront page.

---

## 4. Tier 2 — Cloudflare Worker Version Rollback

Roll back **frontends first**, then **API** so browser clients do not call removed endpoints during transition:

```powershell
# 1. Inspect recent versions before rolling back
npx.cmd wrangler deployments list --config apps/admin-worker/wrangler.production.toml
npx.cmd wrangler deployments list --config apps/customer-worker/wrangler.production.toml
npx.cmd wrangler deployments list --config apps/api/wrangler.production.toml

# 2. Roll back Admin Worker
npx.cmd wrangler rollback <ADMIN_VERSION_ID> --message "Rollback fryzar-admin" --config apps/admin-worker/wrangler.production.toml

# 3. Roll back Customer Storefront Worker
npx.cmd wrangler rollback <APP_VERSION_ID> --message "Rollback fryzar-app" --config apps/customer-worker/wrangler.production.toml

# 4. Roll back Central API Worker
npx.cmd wrangler rollback <API_VERSION_ID> --message "Rollback fryzar-api" --config apps/api/wrangler.production.toml
```

> **Note on Legacy Worker Binding Differences:** Pre-cutover `fryzar-app` (`91fdf9ab-...`) and `fryzar-admin` (`80b357d6-...`) bound directly to `fryzar-production` rather than Service Binding `API -> fryzar-api`. Because `fryzar-production` is preserved untouched during cutover, rolling back `fryzar-app` and `fryzar-admin` to their pre-cutover versions restores the exact pre-cutover runtime if ever required prior to accepting live orders on `fryzar-core`.

---

## 5. Tier 3 — D1 Database Rollback (`fryzar-core`)

> **WARNING:** If live customer orders were accepted on `fryzar-core` after cutover, **export those new orders first** before executing a Time Travel restore so customer fulfillment and COD records are never lost!

```powershell
# 1. Pause checkout first (Tier 1)
# 2. Export any post-cutover orders for manual reconciliation
npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --json --command "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;" > post-cutover-orders-salvage.json

# 3. Restore fryzar-core to pre-cutover Time Travel bookmark
npx.cmd wrangler d1 time-travel restore fryzar-core --bookmark "<PRE_CUTOVER_BOOKMARK>" --config apps/api/wrangler.production.toml
```

---

## 6. Post-Rollback Verification Checklist

1. `GET /api/v1/health` returns `200 OK`.
2. Customer storefront `/` loads without console or TLS errors.
3. Admin `/api/v1/admin/session` returns `401` when unauthenticated (confirming auth guard is intact).
4. `GET /api/v1/monetization-config` confirms `effectiveActive: false` unless explicitly verified safe.
5. Record incident timeline, root cause, and salvaged order IDs per `docs/operations/production-incident-runbook.md`.
