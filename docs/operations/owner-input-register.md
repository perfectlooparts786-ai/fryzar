# FRYZAR — Owner Operational & Business Input Register

**Document ID:** `OWNER-INPUT-REGISTER`  
**Status:** Action Required from Store Owner Prior to Commercial Opening  
**Principle:** Zero business details, phone numbers, addresses, menu prices, allergens, legal registrations, or publisher IDs have been fabricated in code or D1 migrations.

---

## 1. Mandatory Inputs Before Opening Customer Ordering (`store_status = "open"`)

The technical platform enforces a hard release gate (`POST /api/v1/admin/store/launch-gate` returns `422 store_launch_prerequisites_incomplete` until operational prerequisites are satisfied). The Owner must supply and enter the following real-world inputs:

| ID | Category | Required Real-World Input | Where Configured | Current Verified State | Blocking Commercial Launch? |
| --- | --- | --- | --- | --- | :---: |
| `OWN-01` | **Cutover Authorization** | Explicit written approval (`AUTHORIZE_FRYZAR_PRODUCTION_CUTOVER`) + verified D1 backup SHA-256 reference | GitHub Actions `FRYZAR Production Cutover (Gated)` workflow dispatch | `NOT_GRANTED` | **YES** |
| `OWN-02` | **Cloudflare DNS Cleanup & Custom Domains** | Remove unproxied `2.57.91.92` Type `A` records on `fryzar.com` and attach Worker Custom Domains (`fryzar.com` -> `fryzar-app`, `admin.fryzar.com` -> `fryzar-admin`) | Cloudflare Dashboard -> Zone `fryzar.com` -> DNS & Workers Custom Domains | `fryzar.com` currently points to `2.57.91.92` (`ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`) | **YES** |
| `OWN-03` | **First Owner Account Bootstrap** | Owner email address, display name, and strong password (`>= 12` chars) using one-time `OWNER_BOOTSTRAP_TOKEN` | `https://admin.fryzar.com` -> Owner Bootstrap screen (`POST /api/v1/admin/bootstrap-owner`) | `0` staff users in `fryzar-core` & `fryzar-production` | **YES** |
| `OWN-04` | **Store Identity & Contact Channels** | Official store display name (EN/UR), verified customer support phone (`+92...`), WhatsApp number, support email, physical kitchen/pickup city & address, and operating hours | Admin Portal -> **Settings** (`PATCH /api/v1/admin/settings`) | Baseline setup defaults in D1 | **YES** |
| `OWN-05` | **Verified Commercial Menu, Pricing & Allergens** | Final approved categories, product names (EN/UR), descriptions, verified PKR prices (`price_paisa`), product photos (`https://...`), variants/modifiers, allergen tags, and opening stock counts *(or confirmation to import the 3 categories & 4 products from `fryzar-production`)* | Admin Portal -> **Categories**, **Products**, **Modifiers**, **Inventory** | `fryzar-production` has 3 categories & 4 products (`prd-burger` PKR 650, `prd-wrap` PKR 520, `prd-fries` PKR 250, `prd-drink` PKR 150); `fryzar-core` has `0` | **YES** |
| `OWN-06` | **Active Delivery Zones & Fees** | Real neighborhood/sector delivery zones, delivery fees (`fee_paisa`), minimum order amounts (`min_order_paisa`), and estimated delivery minutes (`eta_min_minutes`–`eta_max_minutes`) | Admin Portal -> **Delivery Zones** (`POST /api/v1/admin/delivery-zones`) | `0` delivery zones in `fryzar-core` & `fryzar-production` | **YES** (Enforced by Launch Gate) |
| `OWN-07` | **Operational Staff & Rider Accounts** | Individual accounts for kitchen, operator, rider, manager, and finance staff (never share the Owner account) | Admin Portal -> **Staff** & **Riders** | `0` staff / `0` riders | Recommended Day-1 |
| `OWN-08` | **Legal & Policy Details** | Verified business legal entity name, NTN/registration (if applicable), refund window specifics, and privacy contact email | Admin Portal -> **Settings** & policy verification | Honest generic policy templates rendered; no fake registration numbers invented | **YES** |

---

## 2. Optional Post-Launch Inputs (Non-Blocking for Food Ordering Go-Live)

| ID | Category | Required Real-World Input | Where Configured | Current Default | Blocking Launch? |
| --- | --- | --- | --- | --- | :---: |
| `OWN-09` | **Manual Bank / Wallet Transfer Details** | Bank/JazzCash/Easypaisa account title, IBAN/account number, and instructions before enabling `manual_transfer_enabled` | Feature Flag `manual_transfer_enabled` (currently locked `false` in favor of verified COD) | `false` (COD-first safe default) | No |
| `OWN-10` | **Adsterra Publisher Approval & Zone IDs** | Approved Adsterra publisher account for `https://fryzar.com`, approved Banner/Native `zone_id` values, and `https://` script URLs | Admin Portal -> **Adsterra Monetization** (`docs/monetization/adsterra-launch-checklist.md`) | `adsterra_enabled = false`, all 5 zones inactive | No |
| `OWN-11` | **Promotional Coupons** | Approved launch discount codes, percentage/fixed caps, expiry dates, and usage limits | Admin Portal -> **Coupons** | `0` active coupons | No |
| `OWN-12` | **Suppliers & BOM Recipes** | Raw ingredient stock levels, per-product BOM quantities, and supplier contacts for automated COGS tracking | Admin Portal -> **Ingredients & BOM** / **Suppliers & POs** | Empty (optional alongside product-level stock tracking) | No |
