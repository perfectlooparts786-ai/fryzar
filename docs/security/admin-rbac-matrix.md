# FRYZAR — Admin Role-Based Access Control (RBAC) Matrix

**Document ID:** `ADMIN-RBAC-MATRIX`  
**Status:** Enforced Server-Side & Verified Across All 7 Staff Roles by Automated Unit, Integration & E2E Suites  
**Source of Truth:** `apps/api/src/index.ts`, `apps/api/src/platform-modules.ts`, and `apps/admin/src/App.tsx`

---

## 1. Seven Staff Roles Overview

FRYZAR enforces **deny-by-default, server-side RBAC** on every `/api/v1/admin/*` and `/api/v1/rider/*` route after validating the `__Host-fryzar_admin` session token against SHA-256 `staff_sessions.token_hash`, `is_active = 1`, `revoked_at IS NULL`, and `expires_at > now`. Sidebar visibility in `apps/admin` is strictly aligned with server-side RBAC so no role sees dead-end `403` screens, while API authorization remains the sole security boundary.

| Role | Operational Purpose | PII Access Level | Privilege Tier |
| --- | --- | --- | --- |
| `owner` | Ultimate business authority: store launch gate, SEO settings, Adsterra monetization & kill-switch, full staff & manager lifecycle, refunds, finance, catalogue, orders, diagnostics | Full operational PII (audit-logged) | Tier 0 (Highest) |
| `manager` | Day-to-day store management: catalogue, variants/modifiers, coupons, operational store settings (excluding launch gate/SEO/ads), non-management staff accounts, order cancellations, refunds, inventory, suppliers, POs, support, diagnostics | Customer & order PII for fulfillment/support | Tier 1 |
| `operator` | Front-desk order intake, dispatch & customer support: view/advance order statuses, assign riders, manage support tickets, read catalogue/zones/settings/editorial/SEO | Order contact/address for dispatch & support | Tier 2 |
| `kitchen` | Kitchen prep station: read order queue (**strictly redacted — zero customer phone/address selected in SQL**), advance kitchen prep statuses (`confirmed` → `preparing` → `ready`), view catalogue/ingredients/recipes, log wastage | **Redacted** (Order number, items, variants, modifiers, prep notes only) | Tier 3 (Scoped) |
| `finance` | Accounting & reconciliation: COD cash collection, manual payment verification, refund issuance & status updates using PII-free payment projections, double-entry financial ledger, analytics, coupon redemptions, read-only ad reports | **Redacted** (Order numbers, totals, payment refs, ledger entries — denied `/api/v1/admin/orders`) | Tier 3 (Scoped) |
| `rider` | Delivery fulfillment: view horizontally isolated assigned deliveries (`/api/v1/rider/assignments`), update delivery status strictly on own assigned deliveries (`staff_user_id` check), read rider notifications | Scoped strictly to own assigned deliveries | Tier 3 (Horizontally Isolated) |
| `support` | Customer care desk: triage customer support tickets, post customer replies & internal notes, update ticket status, view operational overview & support notifications (**denied raw order list, finance, catalogue writes, settings, and staff**) | Support ticket contact details submitted by customer | Tier 3 (Scoped) |

---

## 2. Endpoint-by-Endpoint Authorization Matrix (All 7 Roles)

Legend:
- **ALLOW** — Permitted
- **SCOPED** — Permitted with strict SQL projection redaction, event filtering, or horizontal row ownership check
- **DENY** — Rejected with HTTP `403 Forbidden` (or `401 Unauthorized` if unauthenticated)

| Domain | Method & Endpoint | `owner` | `manager` | `operator` | `kitchen` | `finance` | `rider` | `support` | Special Invariants & Protections |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| **Bootstrap & Auth** | `POST /api/v1/admin/bootstrap-owner` | Public (1x) | — | — | — | — | — | — | Allowed `Origin`, `X-Owner-Bootstrap-Token` (constant-time compare), rate-limited (`10/15m`), atomic `bootstrap_claims` (`first_owner`) + zero existing owners check. |
| | `POST /api/v1/admin/login` | Public | Public | Public | Public | Public | Public | Public | Per-IP + per-hashed-identity fail-closed D1 throttle; PBKDF2-SHA256 (`310,000` iterations); generic error message prevents enumeration. |
| | `GET /api/v1/admin/session` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Never returns `password_hash`. |
| | `POST /api/v1/admin/logout` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Revokes active `staff_sessions` row and clears `__Host-fryzar_admin`. |
| **Overview & Analytics** | `GET /api/v1/admin/overview` & `/metrics` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY | ALLOW | Aggregate operational metrics only; `recent_activity` restricted to `owner`/`manager`. |
| | `GET /api/v1/admin/analytics` | ALLOW | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Aggregate product/zone/language/daily performance; zero customer PII. |
| **Orders & Kitchen** | `GET /api/v1/admin/orders` | ALLOW | ALLOW | ALLOW | **SCOPED** | DENY | DENY | DENY | `kitchen` SQL omits `customer_name`, `customer_phone`, `delivery_address`; `finance`, `rider`, `support` denied (`403`). |
| | `PATCH /api/v1/admin/orders/:id/status` | ALLOW | ALLOW | ALLOW | **SCOPED** | DENY | DENY | DENY | State-machine validated; `kitchen` limited to `preparing`/`ready` (`403` on cancel/deliver); cancellations restore stock + BOM atomically. |
| **Catalogue, Variants & Modifiers** | `GET /api/v1/admin/categories`, `products*`, `modifier-groups` | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | Read access for operations/kitchen. |
| | `POST/PATCH/PUT/DELETE` catalogue, variants, modifiers, archive/restore | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Audit-logged mutations; `PATCH /products/:id` blocks direct `stock_qty` overwrite; `DELETE /products/:id` blocks referenced products (`409`). |
| **Promotions & Coupons** | `GET /api/v1/admin/coupons` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY | Read access includes `finance` for promotion reconciliation. |
| | `POST/PUT/DELETE /api/v1/admin/coupons*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Enforces `percent <= 100`, positive values, unique code (`409`), and immutable `audit_logs`. |
| | `GET /api/v1/admin/coupon-redemptions` | ALLOW | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Redemption audit view without customer phone exposure in UI. |
| **Customers** | `GET /api/v1/admin/customers` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Customer directory restricted strictly to `owner` and `manager`. |
| **Delivery & Riders** | `GET /api/v1/admin/delivery-zones` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Admin zone configuration view. |
| | `POST/PATCH /api/v1/admin/delivery-zones*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Zone creation & fee updates restricted to `owner` and `manager`. |
| | `GET /api/v1/admin/riders` & `/deliveries` | ALLOW | ALLOW | ALLOW | ALLOW (Riders) | DENY | **SCOPED** | DENY | `/deliveries` filters strictly to `r.staff_user_id = user.id` for `rider`. |
| | `GET /api/v1/rider/assignments` | ALLOW | ALLOW | DENY | DENY | DENY | **SCOPED** | DENY | Returns only assignments mapped to caller's `staff_user_id`. |
| | `POST/PUT /api/v1/admin/riders*` & `assign-rider` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Dispatch & fleet availability updates (`409 rider_already_exists` on duplicate profile) + `audit_logs`. |
| | `PATCH /api/v1/admin/deliveries/:id/status` | ALLOW | ALLOW | ALLOW | DENY | DENY | **SCOPED** | DENY | **Horizontal isolation:** `rider` may ONLY update assignments mapped to own `staff_user_id` (`403` otherwise). |
| **Inventory, BOM, Procurement & Wastage** | `GET /api/v1/admin/inventory/movements`, `ingredients`, `suppliers`, `purchase-orders`, `wastage` | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | Supply-chain visibility for operations & kitchen. |
| | `POST /api/v1/admin/inventory/adjustments` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Requires `Idempotency-Key`; prevents negative stock (`409`); writes adjustment + movement + audit in 1 D1 batch. |
| | `POST/PUT /api/v1/admin/ingredients*`, `recipe`, `suppliers*`, `purchase-orders*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Full CRUD + PO receive (`purchase_expense` ledger + stock increment + `audit_logs`) restricted to `owner`/`manager`. |
| | `POST /api/v1/admin/wastage` | ALLOW | ALLOW | DENY | ALLOW | DENY | DENY | DENY | `kitchen` can log spoilage/prep wastage with automatic stock + `wastage_expense` ledger + `audit_logs`. |
| **Payments, Refunds & Ledger** | `GET /api/v1/admin/payments` & `/payments/all` | ALLOW | ALLOW | DENY | DENY | **SCOPED** | DENY | DENY | Selects payment records without customer phone/address. |
| | `POST /api/v1/admin/payments/cod-collection` | ALLOW | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Requires `Idempotency-Key`, delivered order; posts `cod_collection` credit + `audit_logs`. |
| | `POST /api/v1/admin/payments/:id/review` | ALLOW | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Manual payment verification/rejection + `financial_ledger` + `audit_logs`. |
| | `GET/POST/PATCH` refunds (`/orders/:id/refund`, `/refunds*`) | ALLOW | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Blocks unpaid orders (`409`), enforces cumulative ceiling, posts ledger reversal on rejection, prevents mutating finalized refunds (`409`). |
| | `GET /api/v1/admin/finance/ledger` & `/finance/summary` | ALLOW | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Full PKR ledger & daily/monthly reconciliation diagnostics. |
| **Support & Notifications** | `GET/POST /api/v1/admin/support/tickets*` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Customer support triage, replies & internal notes (`404` on unknown ticket) + `audit_logs`. |
| | `GET/PATCH /api/v1/admin/notifications*` | ALLOW | ALLOW | ALLOW | **SCOPED** | **SCOPED** | **SCOPED** | **SCOPED** | Filtered by role domain (`kitchen`: order prep; `rider`: delivery; `finance`: payment/refund; `support`: support cases). |
| **Editorial, SEO & Monetization** | `GET /api/v1/admin/editorial` & `/seo` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Read website content & SEO status. |
| | `POST/PUT/DELETE /api/v1/admin/editorial*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Publish/edit bilingual food guides + `audit_logs`. |
| | `PATCH /api/v1/admin/seo` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | DENY | **Owner-only (`403`)** — protects canonical domain & `robots.txt` indexing gate. |
| | `GET /api/v1/admin/advertising` | **ALLOW** | ALLOW | DENY | DENY | ALLOW | DENY | DENY | Read-only visibility for `manager` and `finance`. |
| | `PATCH/POST /api/v1/admin/advertising/*` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | DENY | **Owner-only** settings, zones, revenue reports, and emergency kill-switch. |
| **Governance & Diagnostics** | `GET/PATCH /api/v1/admin/settings` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Blocks `store_status = "open"` (`409 store_requires_release_gate`), `launch_ready`, and `manual_transfer_enabled`. |
| | `POST /api/v1/admin/store/launch-gate` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | DENY | **Owner-only** commercial release gate (`open`, `pause`, `setup`) with readiness validation + `audit_logs`. |
| | `GET/POST/PATCH /api/v1/admin/staff*` | ALLOW | **SCOPED** | DENY | DENY | DENY | DENY | DENY | `manager` cannot create/modify/reset `owner` or `manager`; role/password changes revoke sessions immediately. |
| | `GET /api/v1/admin/audit-logs` & `/system-health` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | DENY | Immutable audit trail & D1/secret-presence/free-tier diagnostics (never exposes secret values). |
