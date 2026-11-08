# FRYZAR — Production Incident Response & Operations Runbook

**Document ID:** `PRODUCTION-INCIDENT-RUNBOOK`  
**Status:** Production-Ready Operational Standard  
**Platform Stack:** Cloudflare Workers + Cloudflare D1 + Cloudflare Edge DNS/TLS

---

## 1. Incident Severity Classification

| Severity | Definition | Target Response | Primary Containment Action |
| --- | --- | --- | --- |
| **SEV-1 (Critical)** | Storefront down (`5xx`/TLS failure), checkout broken while store is open, double-charging/ledger corruption, or unauthorized admin access | Immediate (`< 5 min`) | Pause checkout via Launch Gate (`action: "pause"`), revoke compromised sessions, or roll back Worker (`docs/production/04-rollback-runbook.md`). |
| **SEV-2 (High)** | Kitchen queue or rider status updates failing, tracking page errors, rate-limit table lockup (`503`), or broken third-party Adsterra creative | `< 15 min` | Trigger Adsterra Kill-Switch (if ad-related), inspect `wrangler tail`, or roll back offending Worker. |
| **SEV-3 (Medium)** | Single admin module degraded (e.g., editorial/SEO/CSV view), coupon validation edge case, or slow query warning | `< 2 hours` | Mitigate via admin settings/feature flag; patch on release branch with full CI + preview smoke test. |
| **SEV-4 (Low)** | Copy typo, minor RTL alignment issue, or non-blocking UI polish | Next scheduled release | Track in GitHub issue and bundle into normal release PR. |

---

## 2. Live Diagnostics & Telemetry Commands

Never print secrets during incident triage. Run from `E:/Fryzar/fryzar`:

```powershell
# 1. Stream real-time production API Worker logs & exceptions
npx.cmd wrangler tail fryzar-api --format pretty --config apps/api/wrangler.production.toml

# 2. Check API + D1 schema health
curl.exe -sS https://fryzar.com/api/v1/health

# 3. Inspect recent 20 audit log events in D1
npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "SELECT created_at, actor_type, action, target_type, target_id FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

# 4. Check D1 database size & active in-flight orders
npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "SELECT status, COUNT(*) AS count FROM orders GROUP BY status;"
```

---

## 3. Scenario Playbooks

### Playbook A — Kitchen Overload, Stock Discrepancy, or Menu Pricing Error
1. Open `https://admin.fryzar.com` -> **Settings** -> **Launch & Ordering Gate** -> click **Pause New Orders** (sets `store_status = "paused"` and `launch_ready = false` immediately with audit reason).
2. Storefront automatically displays the paused banner and blocks new checkouts (`503`) while existing customers continue viewing `/track` seamlessly.
3. Correct stock via **Inventory -> Manual Adjustment** or fix product pricing via **Products**.
4. Click **Open Store for Live Orders** once kitchen capacity and pricing are verified.

### Playbook B — Suspected Staff Credential Compromise
1. Sign in as `owner` at `https://admin.fryzar.com` -> **Staff**.
2. Deactivate the affected staff user (`is_active = false`) or reset their password — the API **atomically revokes all active `staff_sessions`** for that user in the same D1 batch.
3. Review `audit_logs` filtered by `actor_id` to inspect every action taken during the window:
   ```powershell
   npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "SELECT created_at, action, target_type, target_id, metadata_json FROM audit_logs WHERE actor_id = '<STAFF_UUID>' ORDER BY created_at DESC LIMIT 50;"
   ```
4. If `TRACKING_SECRET` or `OWNER_BOOTSTRAP_TOKEN` exposure is ever suspected, rotate immediately via `npx.cmd wrangler secret put <SECRET_NAME> --config apps/api/wrangler.production.toml` and update the matching GitHub Actions secret.

### Playbook C — Malicious Ad Creative, Redirect Attempt, or Storefront Lag After Enabling Ads
1. Sign in as `owner` -> **Adsterra Monetization** -> click **Emergency Kill-Switch** (`POST /api/v1/admin/advertising/kill-switch`).
2. Verify `https://fryzar.com/api/v1/monetization-config` shows `"effectiveActive": false` and `"killSwitch": true`.
3. Capture the offending `zone_id` and report to Adsterra support before ever re-enabling that slot.

### Playbook D — Cloudflare Free-Tier Quota Exhaustion (`100k` Worker req/day or `100k` D1 writes/day)
1. **Symptoms:** Elevated HTTP `503` or Cloudflare error `1027` / D1 write limit errors.
2. **Immediate Mitigation:**
   - Enable Cloudflare **Under Attack Mode** or **Bot Fight Mode** on Zone `fryzar.com` -> **Security -> Bots** if traffic spike is automated abuse.
   - Verify daily cron trigger (`17 2 * * *`) is pruning `request_rate_limits`, `auth_rate_limits`, `staff_sessions`, and `idempotency_keys` (`DELETE ... LIMIT 500`).
   - Run an immediate bounded cleanup if rate-limit rows accumulated from an attack:
     ```powershell
     npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "DELETE FROM request_rate_limits WHERE updated_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour');"
     ```
3. **Long-Term Scaling:** Upgrading Workers Paid ($5/month) increases Workers requests to 10M/month and D1 writes to 50M/month with zero code or architecture changes required.

### Playbook E — COD Cash or Refund Ledger Discrepancy
1. Open Admin Portal -> **Finance & Ledger** and **Refunds**.
2. Compare `orders.payment_status`, `payments.status`, `refunds.status`, and `financial_ledger` entries for the specific `order_id`:
   ```powershell
   npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "SELECT entry_type, debit_paisa, credit_paisa, reference_type, reference_id, created_at FROM financial_ledger WHERE order_id = '<ORDER_UUID>' ORDER BY created_at ASC;"
   ```
3. If an approved refund was issued in error before cash payout, use **Refunds -> Reject & Reverse** (`PATCH /api/v1/admin/refunds/:id` `{ "status": "rejected" }`), which posts an audited offsetting `credit_paisa` entry and restores order payment status cleanly.
