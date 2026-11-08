# FRYZAR — Controlled Production Release & Go-Live Runbook

**Document ID:** `07-RELEASE-RUNBOOK`  
**Status:** Ready for Execution Upon Owner Cutover Authorization  
**Release Candidate Branch:** `release/fryzar-production-ready`  
**Gated Workflow:** `.github/workflows/deploy-production.yml` (`FRYZAR Production Cutover (Gated)`)

---

## 1. Reproducible Build & Verification Environment

To reproduce and verify the release candidate from a clean checkout:

| Tool | Verified Version | CI Runner Version |
| --- | --- | --- |
| Node.js | `v24.22.1` (compatible `>= 22.x`) | Node.js `22` (`ubuntu-24.04`) |
| npm | `11.19.1` | Bundled with Node `22` |
| Wrangler | `4.156.0` (pinned in `devDependencies`) | `4.156.0` |
| Playwright | `^1.50.0` (Chromium) | `^1.50.0` |

### Clean Checkout Commands
```powershell
git checkout release/fryzar-production-ready
npm.cmd ci --ignore-scripts
npm.cmd test
npm.cmd run test:config-safety
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

### Required Secrets (Cloudflare `fryzar-api` & GitHub Environment `production`)
| Secret Name | Purpose | Validation Rule |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Locks Wrangler deployments to FRYZAR account | Must equal `234b20e49261c7a002f63b129e985563` |
| `CLOUDFLARE_API_TOKEN` | Least-privilege Workers Scripts + D1 deploy token | Non-empty |
| `TRACKING_SECRET` | Cryptographic signing/derivation secret for private order tracking tokens | `>= 32` characters |
| `OWNER_BOOTSTRAP_TOKEN` | Single-use header secret (`X-Owner-Bootstrap-Token`) for first Owner claim | `>= 32` characters |

---

## 2. Pre-Cutover Go/No-Go Gate Checklist

Every item below must be `YES` before triggering production deployment:

- [ ] **Gate 1 — Owner Authorization Granted:** Owner explicitly approves production cutover (`AUTHORIZE_FRYZAR_PRODUCTION_CUTOVER`).
- [ ] **Gate 2 — CI Green on Release Commit:** `FRYZAR CI` workflow is `completed / success` on the exact commit SHA of `release/fryzar-production-ready`.
- [ ] **Gate 3 — Preview Smoke Verified:** `fryzar-{api,app,admin}-preview.perfectlooparts786.workers.dev` returns `200 OK` on `/api/v1/health` (`schema: "ready"`).
- [ ] **Gate 4 — Production Backups Exported & Restore-Tested:** Both `fryzar-production` and `fryzar-core` exported with SHA-256 manifest and verified locally per `docs/production/03-backup-restore-runbook.md`.
- [ ] **Gate 5 — GitHub `production` Environment Secrets Set:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `TRACKING_SECRET`, and `OWNER_BOOTSTRAP_TOKEN` verified present in GitHub Settings -> Environments -> `production`.

---

## 3. Controlled Cutover Execution Sequence

### Phase A — Database Migration & Worker Cutover (Automated via Gated Workflow)
1. In GitHub -> **Actions -> `FRYZAR Production Cutover (Gated)` -> Run workflow**:
   - `candidate_ref`: `release/fryzar-production-ready` (or exact release tag `v1.0.0`)
   - `cutover_authorization`: `AUTHORIZE_FRYZAR_PRODUCTION_CUTOVER`
   - `verified_backup_reference`: `<Stamp + SHA256 prefix from manifest.sha256.json>`
2. The workflow automatically:
   - Re-runs `typecheck`, unit tests, `test:config-safety`, local D1 migration tests, legacy migration rehearsal, and Vite production builds.
   - Applies pending forward migrations `0005` through `0009` to `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`).
   - Provisions `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN` on `fryzar-api` without printing values.
   - Deploys `fryzar-api` (including daily retention cron `17 2 * * *`), `fryzar-app` (`API -> fryzar-api`), and `fryzar-admin` (`API -> fryzar-api`).
   - Runs post-cutover HTTPS smoke assertions against `https://fryzar-{api,app,admin}.perfectlooparts786.workers.dev` while keeping `store_status = "setup"` (closed to public orders) and `adsterra_enabled = false`.

### Phase B — Optional Legacy Catalogue Import
If the Owner confirms carrying forward the 3 categories and 4 products (`215` stock units) from legacy `fryzar-production`, execute Step 4 & Step 5 of `docs/production/02-database-migration-plan.md`.

### Phase C — Custom Domain & TLS Cutover (`fryzar.com` & `admin.fryzar.com`)
Execute Steps 1–4 of `docs/production/05-domain-and-cloudflare-runbook.md`:
1. Remove the unproxied `2.57.91.92` Type `A` records on `fryzar.com`.
2. Attach Worker Custom Domains:
   - `fryzar.com` -> `fryzar-app`
   - `admin.fryzar.com` -> `fryzar-admin`
   - Configure `www.fryzar.com` -> `301` redirect to `https://fryzar.com`.
3. Verify valid Cloudflare TLS 1.3 handshake on `https://fryzar.com` and `https://admin.fryzar.com`.

### Phase D — First Owner Bootstrap & Store Configuration
1. Open `https://admin.fryzar.com`, enter the one-time `OWNER_BOOTSTRAP_TOKEN`, and create the first `owner` account (`POST /api/v1/admin/bootstrap-owner`).
2. Confirm a second bootstrap attempt immediately fails with `409` (single-use claim locked).
3. Configure verified store contact phone, WhatsApp, address, operating hours, commercial menu/prices/stock, and at least 1 active delivery zone (`docs/operations/owner-input-register.md`).
4. Create individual staff accounts (`manager`, `operator`, `kitchen`, `rider`, `finance`).

### Phase E — Controlled Commercial Opening (`store_status = "open"`)
1. In `https://admin.fryzar.com` -> **Settings -> Launch & Ordering Gate**, verify all four preflight indicators are green:
   - Active categories `>= 1`
   - Active products `>= 1`
   - Active delivery zones `>= 1`
   - Cash on Delivery enabled (`true`)
2. Click **Open Store for Live Orders** (`POST /api/v1/admin/store/launch-gate` `{ "action": "open" }`).
3. Place one real end-to-end internal test COD order on `https://fryzar.com`, advance it through Kitchen -> Rider -> Delivered -> Finance COD Collected, and verify private `/track/:token` and `financial_ledger` reconciliation.

---

## 4. First-Week Post-Launch Hypercare Checklist

- Monitor `npx.cmd wrangler tail fryzar-api --config apps/api/wrangler.production.toml` during peak meal hours for any `429` rate-limit spikes or `5xx` errors.
- Verify daily scheduled cron (`02:17 UTC`) executes cleanly in Cloudflare Workers -> `fryzar-api` -> **Logs / Triggers**.
- Export a daily D1 SQL backup of `fryzar-core` at close of business during Week 1.
- Keep Adsterra disabled (`effectiveActive = false`) until publisher domain approval and real Banner/Native zone IDs are received (`docs/monetization/adsterra-launch-checklist.md`).
