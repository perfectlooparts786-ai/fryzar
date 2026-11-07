# FRYZAR — Application & Infrastructure Security Review

**Document ID:** `SECURITY-REVIEW`  
**Audit Date:** `2026-11-07`  
**Release Candidate Branch:** `release/fryzar-production-ready`  
**Dependency Vulnerability Status (`npm audit`):** `0 vulnerabilities` (0 critical, 0 high, 0 moderate, 0 low)  
**Repository Secret Scan Status:** `0 exposed secrets` across tracked codebase

---

## 1. Security Architecture Summary

FRYZAR implements defense-in-depth across three isolated Cloudflare Workers (`fryzar-api`, `fryzar-app`, `fryzar-admin`) and D1 (SQLite):

| Security Control Domain | Implementation & Verification |
| --- | --- |
| **Password Hashing** | WebCrypto **PBKDF2-HMAC-SHA256** with **310,000 iterations** (`pbkdf2_sha256$310000$<salt>$<hash>`), random per-user salt, and constant-time digest verification. Plaintext passwords are never logged, returned, or persisted. |
| **Admin Session Management** | `__Host-fryzar_admin` cookie (`HttpOnly; Secure; SameSite=Strict; Path=/`), 256-bit cryptographically random token (`64` hex chars), **only SHA-256 `token_hash` stored in `staff_sessions`**. Automatic session revocation on logout, password reset, role change, or account deactivation. |
| **Single-Use Owner Bootstrap** | `POST /api/v1/admin/bootstrap-owner` requires allowed `Origin`, `X-Owner-Bootstrap-Token` (`>= 32` chars, constant-time compare), fail-closed IP rate limit (`10 / 15m`), zero existing owners, and atomic insertion into `bootstrap_claims` (`PRIMARY KEY claim_key = 'first_owner'`). Re-use returns `409 Conflict`. |
| **Server-Side RBAC & Horizontal Isolation** | Six roles (`owner`, `manager`, `operator`, `kitchen`, `rider`, `finance`) enforced per endpoint before D1 queries (`docs/security/admin-rbac-matrix.md`). `kitchen` and `finance` SQL queries omit customer PII columns; `rider` mutations enforce horizontal `staff_user_id` ownership. |
| **SQL Injection Prevention** | 100% parameterized prepared statements (`env.DB.prepare(...).bind(...)`) across `apps/api/src/index.ts` and `apps/api/src/platform-modules.ts`. Zero dynamic user-input SQL string interpolation. |
| **Fail-Closed D1 Rate Limiting** | Durable rolling-window throttles (`auth_rate_limits` & `request_rate_limits`) that **fail closed (`503` / `429`)** if client IP is absent in `preview`/`production` or if the D1 rate-limit table fails: Checkout (`10 / 5m`), Login (per-IP & per-hashed-identity), Owner Bootstrap (`10 / 15m`), Coupon Validation (`20 / 5m`), Support Tickets (`5 / 10m`), Ad Telemetry (`60 / 1m`). |
| **Server-Authoritative Pricing & Stock** | Checkout ignores client-supplied prices/totals, computes unit prices + variant deltas + modifier prices + server coupon rules + active zone delivery fees in integer `paisa`, enforces required modifier groups, and executes atomic D1 batches with optimistic stock guards (`stock_quantity >= ?`). |
| **Idempotency & Replay Protection** | `Idempotency-Key` enforced on checkout (`POST /api/v1/checkout`), manual inventory adjustments, and COD cash collection using canonical SHA-256 payload hashing (including sorted items, variants, modifiers, and normalized `coupon_code`). Key reuse with altered payload returns `409 idempotency_payload_mismatch`. |
| **Private Order Tracking Token** | Opaque HMAC/high-entropy tracking token (`GET /api/v1/orders/track/:token`) returns order number, items, totals, fulfillment status, and stage timestamps (`timeline: Array<{ status, created_at }>`) while **redacting customer phone, delivery address, internal staff notes, and staff IDs**. |
| **CORS & Origin Enforcement** | Strict exact-match `ALLOWED_ORIGINS` allowlist; disallowed `Origin` headers receive `403 Forbidden`. Zero `*` wildcards. |
| **HTTP Security Headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, CSP policies on static `_headers`, and `X-Robots-Tag: noindex, nofollow, noarchive` on all admin and API responses. |
| **Adsterra Third-Party Script Containment** | Disabled by default (`adsterra_enabled = false`), Owner-only mutations, HTTPS-only script origin validation, hard-coded commercial route blocklist (`/basket`, `/checkout`, `/track`, `/admin/*`), prohibited intrusive format blocklist, PII rejection (`400`) on `/api/v1/ad-events`, and atomic emergency kill-switch. |

---

## 2. Security Defects Remediated in `release/fryzar-production-ready`

| Finding ID | Severity | Description | Remediation Applied & Verified |
| --- | --- | --- | --- |
| `SEC-01` | High | `POST /api/v1/admin/orders/:id/refund` allowed creating approved refund ledger entries on unpaid orders (`payment_status = 'pending'`). | Enforced `payment_status IN ('collected', 'verified', 'refunded')` before refund creation (`409 order_payment_not_collected`). |
| `SEC-02` | High | `PATCH /api/v1/admin/refunds/:id` rejecting a previously approved refund left the initial `debit_paisa` entry unreversed in `financial_ledger` and allowed mutating finalized refunds. | Added immutable guard (`409 refund_already_finalized`) and atomic offsetting reversal entry (`entry_type = 'refund', credit_paisa = amount_paisa`) + payment status restoration on rejection. |
| `SEC-03` | Medium | `checkout()` canonical idempotency hash omitted `coupon_code` and sorted items only by `product_id` (not variant/modifiers). | Included normalized `coupon_code` (when present), deterministic composite item+variant+modifier sorting, and `discount_paisa` in replayed order payload. |
| `SEC-04` | Medium | Public endpoints `bootstrap-owner`, `coupons/validate`, `support/tickets`, and `ad-events` lacked durable per-IP D1 rate limits. | Added fail-closed D1 rate limiters across all four endpoints (`10/15m`, `20/5m`, `5/10m`, `60/1m`). |
| `SEC-05` | Medium | `PATCH /api/v1/admin/seo` allowed `manager` role to alter global indexing/canonical settings, and no audited Owner launch gate existed to transition `store_status` safely. | Restricted `PATCH /api/v1/admin/seo` strictly to `owner` (`403`) and implemented Owner-only `POST /api/v1/admin/store/launch-gate` with prerequisite validation and immutable audit logging. |
| `SEC-06` | High (Infra) | Live production `fryzar-api` Worker currently runs with `APP_ENV="development"`, `ALLOWED_ORIGINS="http://localhost:5173..."`, and missing `OWNER_BOOTSTRAP_TOKEN`, while `fryzar.com` resolves unproxied to `2.57.91.92`. | Authored hardened `wrangler.production.toml` configs (`APP_ENV="production"`, strict production `ALLOWED_ORIGINS`), secret-validating `.github/workflows/deploy-production.yml`, and DNS/TLS remediation runbook (`docs/production/05-domain-and-cloudflare-runbook.md`). |

---

## 3. Secret Inventory & Handling Policy

| Secret Name | Scope | Required Entropy | Current Preview Status | Current Production Status |
| --- | --- | --- | --- | --- |
| `TRACKING_SECRET` | Cloudflare Worker Secret (`fryzar-api*`) + GitHub Secret | `>= 32` random bytes | Configured (`secret_text` verified) | Configured on `fryzar-api` (rotate/re-verify during cutover) |
| `OWNER_BOOTSTRAP_TOKEN` | Cloudflare Worker Secret (`fryzar-api*`) + GitHub Secret | `>= 32` random bytes | Configured (`secret_text` verified) | **Missing on live `fryzar-api`** — provisioned automatically by `.github/workflows/deploy-production.yml` at cutover |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions Secret | Least-privilege scoped token | Configured in GitHub Actions | Configured in GitHub Actions |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions Secret / Wrangler target | Exact ID `234b20e49261c7a002f63b129e985563` | Verified | Verified |

Zero secret values were printed, logged, or committed during this audit and release preparation.
