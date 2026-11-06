# FRYZAR Security & Privacy Review

**Last updated:** 7 November 2026  
**Reviewed branch:** `feature/fryzar-master-transformation`  
**Scope:** Application authentication, RBAC, transactional integrity, PII redaction, CORS/Origin controls, rate limiting, and third-party ad script containment.

## 1. Verified Security Controls

### Authentication, Passwords & Sessions
- **Password Hashing:** Salted PBKDF2-SHA256 at **310,000 iterations** with constant-time verification and dummy hashing on unknown/inactive emails to prevent timing enumeration.
- **Session Cookies:** 32 cryptographic random bytes; only SHA-256 hash stored in `staff_sessions`; 8-hour expiry; `__Host-` prefix with `Secure; HttpOnly; SameSite=Strict; Path=/`.
- **Immediate Revocation:** Role changes, password resets, staff deactivation, and logout immediately revoke active sessions in D1.
- **Single-Use Owner Bootstrap:** Requires exact allowed `Origin`, `OWNER_BOOTSTRAP_TOKEN` >= 32 bytes, constant-time comparison, and atomic `bootstrap_claims` (`claim_key = 'first_owner'`) insertion.

### Role-Based Access Control (7 Roles)
Enforced server-side on every `/api/v1/admin/*` route:
- `owner` — Exclusive control over **Advertising & Monetization**, **SEO overrides**, **System Health**, and owner-tier staff governance.
- `manager` — Catalogue, inventory adjustments, procurement, coupons, refunds, customers directory, and non-owner staff management.
- `kitchen` — Scoped order queue (`confirmed -> preparing -> ready`) with **customer phone and delivery address nulled in SQL/projection**.
- `rider` — Delivery zones and assigned dispatch statuses.
- `finance` — COD collection, refunds, and financial ledger/reconciliation **without customer phone/address exposure**.
- `support` — Customer support ticket triage and threaded replies.
- `operator` — Day-to-day order monitoring without destructive inventory or role privileges.

### Checkout, Pricing & Financial Integrity
- **Server-Authoritative Integer Paisa Pricing:** Client unit prices and totals are ignored; server recomputes base/variant price, modifier option prices, required min/max modifier rules, coupon caps/expiry, and delivery zone minimums/fees.
- **Idempotency:** `Idempotency-Key` required on `POST /api/v1/orders`, `POST /api/v1/admin/inventory/adjustments`, and `POST /api/v1/admin/payments/cod-collection` (24-hour payload-hashed replay protection).
- **Atomic Stock Reservation:** Conditional stock decrements + SQLite negative-stock triggers prevent concurrent overselling.
- **Archive-Over-Delete Protection:** `DELETE /api/v1/admin/products/:id` refuses deletion (`409 product_has_history_archive_instead`) whenever historical orders or stock movements reference the product.
- **Manual Bank Transfer Disabled:** Kept disabled (`manual_transfer_enabled = false`) because private R2 receipt storage is intentionally omitted under the $0 Free-tier architecture.

### Customer Privacy & Ad Containment
- **Private Order Tracking:** 64-hex HMAC-derived token; only SHA-256 digest stored; `/api/v1/orders/track/:token` never returns customer phone or street address.
- **Zero-PII Ad Telemetry:** `POST /api/v1/monetization/events` inspects JSON keys and rejects any payload containing `name`, `phone`, `email`, `address`, `token`, `session`, or `cookie`.
- **Ad Script Sandboxing & Restricted Routes:** Third-party ad tags are disabled by default, blocked on all transactional/policy routes, restricted to verified `https://` script origins (`adSafety.ts`), and governed by a 1-click Owner Emergency Kill Switch.

### Origin, Rate Limiting & Headers
- **Exact Origin Enforcement:** Browser state-changing endpoints require an exact origin match in `ALLOWED_ORIGINS` (zero wildcard `*` CORS).
- **Fail-Closed D1 Rate Limiting:** Hashed client IP + rolling identity login failure throttling (`checkout` 5/10m, `tracking` 40/1m, `login` 5/15m).
- **Hardened HTTP Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Cache-Control: no-store` on API JSON.
