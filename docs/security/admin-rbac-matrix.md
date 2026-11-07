# FRYZAR — Admin Role-Based Access Control (RBAC) Matrix

**Document ID:** `ADMIN-RBAC-MATRIX`  
**Status:** Enforced Server-Side & Verified by Automated Unit + Integration Suites  
**Source of Truth:** `apps/api/src/index.ts` & `apps/api/src/platform-modules.ts`

---

## 1. Staff Roles Overview

FRYZAR enforces **deny-by-default, server-side RBAC** on every `/api/v1/admin/*` route after validating the `__Host-fryzar_admin` session token against SHA-256 `staff_sessions.token_hash`, `is_active = 1`, `revoked_at IS NULL`, and `expires_at > now`. UI hiding in `apps/admin` is purely ergonomic; every privilege boundary is enforced inside the API Worker before executing D1 queries.

| Role | Operational Purpose | PII Access Level |Privilege Tier |
| --- | --- | --- | --- |
| `owner` | Ultimate business authority: store launch gate, SEO settings, Adsterra monetization & kill-switch, feature flags, full staff & manager lifecycle, refunds, finance, catalogue, orders | Full operational PII (audit-logged) | Tier 0 (Highest) |
| `manager` | Day-to-day store management: catalogue, modifiers, coupons, operational store settings (excluding launch gate/SEO/ads), non-management staff accounts, order cancellations, refunds, inventory, suppliers, POs, support | Customer & order PII for fulfillment/support | Tier 1 |
| `operator` | Front-desk order intake & customer support: view/advance order statuses, assign riders, respond to customer support tickets, read store settings | Order contact/address for dispatch & support | Tier 2 |
| `kitchen` | Kitchen prep station: read order queue (**strictly redacted — zero customer phone/address selected in SQL**), advance kitchen prep statuses, log ingredient/product wastage | **Redacted** (Order number, items, modifiers, prep notes only) | Tier 3 (Scoped) |
| `rider` | Delivery fulfillment: view delivery zones and **horizontally isolated** assigned orders only; update delivery status strictly on own assigned deliveries (`rider_id` linked to `staff_user_id`) | Scoped to assigned active deliveries | Tier 3 (Horizontally Isolated) |
| `finance` | Accounting & reconciliation: COD cash collection, manual payment verification, refund ledger approval/rejection, double-entry ledger & settlement batches (**denied raw customer order list**) | **Redacted** (Order totals, payment refs, ledger entries — no customer contact fields) | Tier 3 (Scoped) |

---

## 2. Endpoint-by-Endpoint Authorization Matrix

Legend:
- **ALLOW** — Permitted
- **SCOPED** — Permitted with strict SQL projection redaction or horizontal row ownership check
- **DENY** — Rejected with HTTP `403 Forbidden` (or `401 Unauthorized` if unauthenticated)

| Domain | Method & Endpoint | `owner` | `manager` | `operator` | `kitchen` | `rider` | `finance` | Special Invariants & Protections |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| **Bootstrap & Auth** | `POST /api/v1/admin/bootstrap-owner` | Public (1x) | — | — | — | — | — | Requires allowed `Origin`, `X-Owner-Bootstrap-Token` (constant-time compare), rate-limited (`10/15m`), atomic single-use `bootstrap_claims` (`first_owner`) + zero existing owners check. |
| | `POST /api/v1/admin/login` | Public | Public | Public | Public | Public | Public | Per-IP + per-hashed-identity fail-closed D1 throttle; PBKDF2-SHA256 (`310,000` iterations); generic error message prevents account enumeration. |
| | `GET /api/v1/admin/session` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Never returns `password_hash`. |
| | `POST /api/v1/admin/logout` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Revokes active `staff_sessions` row and clears `__Host-fryzar_admin`. |
| **Dashboard** | `GET /api/v1/admin/dashboard` | ALLOW | ALLOW | ALLOW | ALLOW | DENY | ALLOW | Aggregate operational metrics only; zero customer PII returned. |
| **Orders** | `GET /api/v1/admin/orders` | ALLOW | ALLOW | ALLOW | **SCOPED** | **SCOPED** | DENY | `kitchen` SQL omits `customer_phone` & `delivery_address`; `finance` denied (`403`). |
| | `PATCH /api/v1/admin/orders/:id/status` | ALLOW | ALLOW | ALLOW | **SCOPED** | **SCOPED** | DENY | State-machine validated; `kitchen` cannot cancel (`403`). |
| | `POST /api/v1/admin/orders/:id/cancel` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Atomic stock + BOM restoration + `inventory_movements` + `audit_logs`. |
| **Payments & Finance** | `GET /api/v1/admin/payments` | ALLOW | ALLOW | DENY | DENY | DENY | **SCOPED** | Selects payment records without customer phone/address. |
| | `POST /api/v1/admin/orders/:id/cod-collect` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Requires `Idempotency-Key`, delivered order, exact amount match; posts ledger entry. |
| | `GET /api/v1/admin/payment-proofs` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Manual transfer proof queue. |
| | `POST /api/v1/admin/payment-proofs/:id/review` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Approving posts `manual_payment` credit to `financial_ledger` + audit log. |
| | `POST /api/v1/admin/orders/:id/refund` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Blocks unpaid orders (`409 order_payment_not_collected`) & enforces cumulative refund ceiling (`<= total_paisa`). |
| | `GET /api/v1/admin/refunds` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Lists refund records. |
| | `PATCH /api/v1/admin/refunds/:id` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Rejecting an approved refund posts offsetting `credit_paisa` reversal to `financial_ledger` and restores payment status; finalized refunds (`completed`/`rejected`) are immutable (`409`). |
| | `GET /api/v1/admin/finance/summary` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Reconciles order charges, collections, net refunds `(debit - credit)`, purchases, and wastage. |
| | `GET/POST /api/v1/admin/settlements` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Settlement batch tracking + audit log. |
| **Catalogue & Modifiers** | `GET /api/v1/admin/categories` & `products` | ALLOW | ALLOW | ALLOW | ALLOW | DENY | DENY | Read access for operations/kitchen. |
| | `POST/PATCH /api/v1/admin/categories*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Audit-logged category mutations. |
| | `POST/PATCH /api/v1/admin/products*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | `PATCH` cannot overwrite tracked `stock_quantity` directly (must use inventory adjustment ledger). |
| | `DELETE /api/v1/admin/products/:id` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Refuses deletion (`409`) if order items or inventory movements reference the product (enforces archiving instead). |
| | `GET/POST/PATCH /api/v1/admin/modifiers*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Product modifier groups, min/max rules, options, and product assignments. |
| **Inventory, BOM & Wastage** | `GET /api/v1/admin/inventory/movements` | ALLOW | ALLOW | ALLOW | ALLOW | DENY | ALLOW | Immutable stock movement history. |
| | `POST /api/v1/admin/inventory/adjustments` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Requires `Idempotency-Key`; prevents negative stock (`409`); writes adjustment + movement + audit in 1 D1 batch. |
| | `GET /api/v1/admin/ingredients` & `recipes` | ALLOW | ALLOW | DENY | ALLOW | DENY | ALLOW | Ingredient stock & BOM recipes. |
| | `POST/PATCH /api/v1/admin/ingredients` & `recipes` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Recipe & ingredient configuration restricted to Owner/Manager. |
| | `GET/POST /api/v1/admin/wastage` | ALLOW | ALLOW | DENY | ALLOW | DENY | DENY | Kitchen can log spoilage/prep wastage with automatic stock + `wastage_expense` ledger deduction; cannot edit suppliers/POs. |
| | `GET/POST/PATCH /api/v1/admin/suppliers` & `purchase-orders*` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW (Read) | Supplier & PO creation/receiving restricted to Owner/Manager (`finance` read-only where applicable). |
| **Delivery & Riders** | `GET /api/v1/admin/delivery-zones` | ALLOW | ALLOW | ALLOW | DENY | ALLOW | DENY | Riders can read zones. |
| | `POST/PATCH /api/v1/admin/delivery-zones*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Zone creation & fee updates restricted to Owner/Manager. |
| | `GET/POST/PATCH /api/v1/admin/riders*` | ALLOW | ALLOW | ALLOW (Read) | DENY | DENY | DENY | Rider roster management. |
| | `POST /api/v1/admin/deliveries/assign` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | Dispatch rider assignment. |
| | `PATCH /api/v1/admin/deliveries/:id/status` | ALLOW | ALLOW | ALLOW | DENY | **SCOPED** | DENY | **Horizontal isolation:** `rider` role may ONLY update assignments mapped to their own `staff_user_id` (`403 rider_assignment_mismatch` otherwise). |
| **Customers, Coupons & Support** | `GET /api/v1/admin/customers` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Customer directory restricted strictly to Owner/Manager. |
| | `GET/POST/PATCH /api/v1/admin/coupons*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Promo rules, usage caps, expiry, min order thresholds. |
| | `GET/POST/PATCH /api/v1/admin/support/tickets*` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | Customer support ticket triage & staff replies. |
| **Content & SEO** | `GET/POST/PATCH /api/v1/admin/editorial*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Bilingual food guides & editorial publishing. |
| | `GET /api/v1/admin/seo` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Read SEO templates. |
| | `PATCH /api/v1/admin/seo` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | **Owner-only (`403 owner_permission_required`)** — protects domain indexing/canonical configuration. |
| **Store Settings, Flags & Launch Gate** | `GET /api/v1/admin/settings` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | Read operational store settings. |
| | `PATCH /api/v1/admin/settings` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Blocks `store_status = "open"` (`409 store_requires_release_gate`), `launch_ready`, and `manual_transfer_enabled`. |
| | `POST /api/v1/admin/store/launch-gate` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | **Owner-only** commercial release gate (`open`, `pause`, `setup`); enforces >=1 active category, >=1 active product, >=1 active delivery zone, and `cod_enabled === true`. |
| | `GET/PATCH /api/v1/admin/feature-flags` | **ALLOW** | ALLOW (Read) | DENY | DENY | DENY | DENY | Feature flag mutations restricted strictly to Owner. |
| **Adsterra Monetization** | `GET /api/v1/admin/advertising` | **ALLOW** | ALLOW (Read) | DENY | DENY | DENY | ALLOW (Read) | Inspect ad safety config, zone status, and aggregate non-PII counts. |
| | `PATCH /api/v1/admin/advertising/settings` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | **Owner-only**; blocks prohibited intrusive formats (`422`). |
| | `PATCH /api/v1/admin/advertising/zones/:key` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | **Owner-only**; blocks activation without real publisher zone ID + HTTPS script URL (`422`). |
| | `POST /api/v1/admin/advertising/kill-switch` | **ALLOW** | **DENY** | DENY | DENY | DENY | DENY | **Owner-only** atomic emergency disable of master flag + all ad zones. |
| **Staff & Audit** | `GET /api/v1/admin/staff` | ALLOW | ALLOW | DENY | DENY | DENY | DENY | Never selects `password_hash`. |
| | `POST/PATCH /api/v1/admin/staff*` | ALLOW | **SCOPED** | DENY | DENY | DENY | DENY | `manager` cannot create/modify/reset `owner` or `manager` accounts; nobody can deactivate first owner or self; role/password changes revoke all active sessions immediately. |
| | `GET /api/v1/admin/audit-logs` | ALLOW | ALLOW | DENY | DENY | DENY | ALLOW | Immutable audit trail inspection. |
