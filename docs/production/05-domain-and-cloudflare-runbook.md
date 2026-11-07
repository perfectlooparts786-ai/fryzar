# FRYZAR — Domain, DNS, SSL/TLS & Cloudflare Cutover Runbook

**Document ID:** `05-DOMAIN-AND-CLOUDFLARE-RUNBOOK`  
**Status:** Forensically Audited — Action Required During Authorized Go-Live  
**Zone Name:** `fryzar.com` (`5bf861ca1d9d0db58eab8fa3e768031c`)  
**Cloudflare Account ID:** `234b20e49261c7a002f63b129e985563`  
**Workers Subdomain:** `perfectlooparts786.workers.dev`

---

## 1. Forensic Findings on Current `fryzar.com` DNS & TLS State (Verified 2026-11-07)

| Property | Live Verified State | Assessment |
| --- | --- | --- |
| Cloudflare Zone `fryzar.com` | Status: `active`, Plan: `Free Website`, Nameservers: `jarred.ns.cloudflare.com`, `vera.ns.cloudflare.com` | Active in target Cloudflare account |
| Worker Custom Domains | `0` configured | Not yet attached (`PRODUCTION_CUTOVER_AUTHORIZATION = NOT_GRANTED`) |
| Worker Routes | `0` configured | Not yet attached |
| Public DNS (`fryzar.com`, `www.fryzar.com`, `admin.fryzar.com`, `api.fryzar.com`) | All 4 hostnames resolve via DNS Type `A` to **`2.57.91.92`** (unproxied / grey-cloud origin IP, NOT Cloudflare Anycast proxy IPs `104.21.x.x` / `172.67.x.x`) | **CRITICAL GO-LIVE BLOCKER** |
| Public HTTPS Handshake (`https://fryzar.com`, `www`, `admin`, `api`) | Fails immediately with **`ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`** from `2.57.91.92` | **CRITICAL GO-LIVE BLOCKER** |
| Cloudflare `*.workers.dev` TLS (`fryzar-{api,app,admin}-preview.perfectlooparts786.workers.dev` & `fryzar-{api,app,admin}.perfectlooparts786.workers.dev`) | `200 OK` over valid TLS 1.3 Cloudflare Edge Certificates | Healthy |

### Root Cause of `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`
Because `fryzar.com` currently has unproxied (DNS-only / grey-cloud) Type `A` / wildcard records pointing to legacy host IP `2.57.91.92` and `0` Cloudflare Worker Custom Domains attached, browsers connect directly to `2.57.91.92`, which refuses TLS SNI for `fryzar.com`. Furthermore, the scoped Wrangler API token lacks `Zone:DNS:Read/Edit` permissions, meaning **DNS record cleanup and Worker Custom Domain attachment must be executed in the Cloudflare Dashboard (or with a Zone-DNS-enabled token) during authorized cutover**.

---

## 2. Target Production Hostname Topology ($0 Cloudflare Free Plan)

| Public Hostname | Target Cloudflare Worker | Mechanism | Browser CORS / Origin Role |
| --- | --- | --- | --- |
| `fryzar.com` | `fryzar-app` | **Worker Custom Domain** | Canonical customer storefront origin (`PUBLIC_STORE_URL = https://fryzar.com`) |
| `www.fryzar.com` | Cloudflare Redirect Rule -> `https://fryzar.com${http.request.uri.path}` (`301`) *(or Worker Custom Domain on `fryzar-app`)* | **Single Redirect Rule** (Free Tier includes 10 rules) | Redirects cleanly to canonical apex `https://fryzar.com` |
| `admin.fryzar.com` | `fryzar-admin` | **Worker Custom Domain** | Dedicated staff & owner operations portal (`X-Robots-Tag: noindex, nofollow, noarchive`) |
| `api.fryzar.com` *(optional direct API)* | `fryzar-api` | **Worker Custom Domain** *(optional)* | Note: Both `fryzar-app` and `fryzar-admin` already proxy `/api/*`, `/sitemap.xml`, and `/robots.txt` internally to `fryzar-api` over zero-latency Cloudflare **Service Bindings** (`env.API`), which avoids cross-origin preflight overhead and keeps `__Host-fryzar_admin` `SameSite=Strict` cookies first-party on `admin.fryzar.com`! |

> **Architectural Advantage:** Because `fryzar-app` and `fryzar-admin` forward `/api/*` via Cloudflare Service Bindings (`apps/customer-worker/src/index.js` and `apps/admin-worker/src/index.js`), `__Host-fryzar_admin` cookies operate strictly first-party on `https://admin.fryzar.com` with `Secure; HttpOnly; SameSite=Strict; Path=/`.

---

## 3. Step-by-Step Domain & TLS Remediation (Execute ONLY at Authorized Go-Live)

### Step 1 — Remove Unproxied `2.57.91.92` DNS Records
In Cloudflare Dashboard -> Account `perfectlooparts786` -> Zone `fryzar.com` -> **DNS -> Records**:
1. Export existing DNS zone file (`Advanced -> Export`) and save alongside the D1 pre-cutover backup folder for rollback reference.
2. Delete or disable the unproxied Type `A` records pointing `@` (`fryzar.com`), `*`, `www`, `admin`, and `api` to `2.57.91.92` (leave any verified `MX` / `SPF` / `DKIM` email records untouched if present).

### Step 2 — Verify SSL/TLS Edge Settings
In Cloudflare Dashboard -> Zone `fryzar.com` -> **SSL/TLS**:
1. **Overview:** Set encryption mode to **Full (strict)** (Worker Custom Domains terminate at Cloudflare's edge with managed Universal SSL certificates).
2. **Edge Certificates:**
   - Verify **Universal SSL** status is **Active** covering `fryzar.com` and `*.fryzar.com`.
   - Enable **Always Use HTTPS** (`On`).
   - Set **Minimum TLS Version** to **TLS 1.2**.
   - Enable **Automatic HTTPS Rewrites** (`On`).
   - Enable **HSTS** *only after* verifying `https://fryzar.com` and `https://admin.fryzar.com` return `200 OK` (`Max-Age: 6 months`, `No-Sniff: On`; do **not** enable `preload` until all subdomains are permanently HTTPS).

### Step 3 — Attach Worker Custom Domains
After deploying the verified production Workers (`fryzar-api`, `fryzar-app`, `fryzar-admin` via `.github/workflows/deploy-production.yml`):
1. Go to **Workers & Pages -> `fryzar-app` -> Settings -> Domains & Routes -> + Add -> Custom Domain**:
   - Enter `fryzar.com` -> **Add Custom Domain**.
2. Go to **Workers & Pages -> `fryzar-admin` -> Settings -> Domains & Routes -> + Add -> Custom Domain**:
   - Enter `admin.fryzar.com` -> **Add Custom Domain**.
3. *(Optional)* Go to **Workers & Pages -> `fryzar-api` -> Settings -> Domains & Routes -> + Add -> Custom Domain**:
   - Enter `api.fryzar.com` -> **Add Custom Domain**.
4. Go to Zone `fryzar.com` -> **Rules -> Redirect Rules -> Create Rule**:
   - **Rule name:** `Redirect www to canonical apex`
   - **When incoming requests match:** Hostname equals `www.fryzar.com` (first ensure a proxied dummy AAAA `100::` record exists for `www` with **Proxied = Orange Cloud**)
   - **Then:** Dynamic Redirect `concat("https://fryzar.com", http.request.uri.path)` with status `301` and **Preserve query string = checked**.

### Step 4 — Pre-Configured CORS Allowlist Verification
`apps/api/wrangler.production.toml` is already pre-configured with exact production origins:
```toml
ALLOWED_ORIGINS = "https://fryzar.com,https://www.fryzar.com,https://admin.fryzar.com,https://fryzar-app.perfectlooparts786.workers.dev,https://fryzar-admin.perfectlooparts786.workers.dev"
PUBLIC_STORE_URL = "https://fryzar.com"
```
No wildcard (`*`) CORS origins exist anywhere in the codebase.

---

## 4. Post-DNS Cutover Verification Commands

Run from any external terminal once Cloudflare provisions the Custom Domain edge certificates (~30–90 seconds):

```powershell
# 1. Confirm Cloudflare Anycast IPs (must NOT be 2.57.91.92)
Resolve-DnsName fryzar.com -Type A
Resolve-DnsName admin.fryzar.com -Type A

# 2. Confirm HTTPS 200 + security headers on Customer Storefront
curl.exe -sSI https://fryzar.com/
curl.exe -sS https://fryzar.com/api/v1/health

# 3. Confirm 301 redirect from www -> apex
curl.exe -sSI https://www.fryzar.com/menu

# 4. Confirm HTTPS 200 + X-Robots-Tag: noindex on Admin Portal
curl.exe -sSI https://admin.fryzar.com/
curl.exe -sSI https://admin.fryzar.com/api/v1/admin/session

# 5. Confirm production robots.txt & sitemap.xml
curl.exe -sS https://fryzar.com/robots.txt
curl.exe -sS https://fryzar.com/sitemap.xml
```

---

## 5. Free-Tier Guardrails & Quotas (`$0` Footprint)

| Cloudflare Free Tier Resource | Included Free Allowance | FRYZAR Safeguard Implemented |
| --- | --- | --- |
| Workers Requests | `100,000` requests / day | Static SPA assets (`fryzar-app`, `fryzar-admin`) served via Workers Static Assets (`ASSETS` binding — static asset hits are free and do not invoke Worker script unless SPA fallback/API route is needed). |
| D1 Rows Read | `5,000,000` rows / day | Bounded pagination (`LIMIT <= 100`), composite indexes across all 46 tables (`39` indexes), no unbounded full-table scans. |
| D1 Rows Written | `100,000` rows / day | Fail-closed D1 rate limits on public write endpoints + bounded daily cron retention (`DELETE ... LIMIT 500` at `02:17 UTC`). |
| D1 Storage | `5 GB` total | Current footprint `< 1.3 MB` across all 3 databases combined; daily retention prunes expired sessions, rate-limit buckets, and expired idempotency keys. |
