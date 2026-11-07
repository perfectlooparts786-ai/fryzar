# FRYZAR Owner Business Inputs & Launch Configuration Guide

**Purpose:** Exact checklist of real-world business data and credentials that **only the FRYZAR Owner** can supply prior to opening public ordering on `fryzar.com`. None of these values are ever fabricated or guessed by engineering.

---

## 1. Built-In Admin Readiness Checklist

After claiming the first Owner account, sign in to the Admin Control Center (`Overview` tab) to view the live **Owner Setup & Cutover Readiness Checklist** (`OwnerSetupReadinessCard`), which automatically inspects live API state across 6 operational gates and provides 1-click navigation to each configuration module.

---

## 2. Required Owner Inputs Before Opening Public Ordering

| # | Business Input | Where Configured | Validation Rule / Format | Current Preview State |
|---|---|---|---|---|
| 1 | **First-Owner Account Claim** | Admin Sign-In -> *First-owner setup* (`POST /api/v1/admin/bootstrap`) | Requires secret `OWNER_BOOTSTRAP_TOKEN` (>= 32 chars), Owner full name, email, and strong password (>= 12 chars). Single-use atomic claim (`first_owner`). | Unclaimed (`0` staff rows in `fryzar-preview` & `fryzar-production`) |
| 2 | **Store Identity & Operating Hours** | Admin -> **25. Store Settings** | `store_name_en`, `store_name_ur`, `operating_hours_en`, `operating_hours_ur` (e.g., `Daily 12:00 PM – 11:30 PM PKT`). | Default FRYZAR identity seeded; awaiting Owner review |
| 3 | **Customer Support Phone & WhatsApp** | Admin -> **25. Store Settings** | Valid international E.164 phone number (e.g., `+923XXXXXXXXX`) for `support_phone` and `whatsapp_number`. | Placeholder empty — **Owner must enter real business line** |
| 4 | **Active Delivery Zones, Fees & Minimums** | Admin -> **14. Delivery Zones** | At least 1 active zone with `code`, `name_en`, `name_ur`, `city`, `delivery_fee_paisa` (PKR × 100), `minimum_order_paisa`, and `estimated_mins_min`/`max`. | `0` zones in `fryzar-preview` — **Owner must define real delivery areas** |
| 5 | **Final Menu Catalogue, Variants, Stock & Photos** | Admin -> **4. Products**, **5. Categories**, **6. Gallery**, **7. Variants & Modifiers**, **8. Stock** | Verified PKR prices, bilingual EN/UR names & descriptions, opening stock quantities, and public `https://` product image URLs (note: `fryzar-production` has **3 categories, 4 products, and 215 stock units** ready for lossless import via `scripts/migrate-legacy-production-catalogue.cjs`). | `0` products in `fryzar-preview`; `4` legacy products (`215` units) preserved in `fryzar-production` |
| 6 | **Staff Role Accounts** | Admin -> **26. Staff, Roles & Audit** | Create scoped accounts for `manager`, `kitchen`, `rider`, `finance`, and `support` staff; link each `rider` profile in **15. Riders & Dispatch**. | Ready for Owner creation post-bootstrap |
| 7 | **Explicit Store Opening Switch** | Controlled Launch Gate (`store_status = "open"`, `launch_ready = true`) | Kept closed (`setup` / `false`) until Gates 1–6 above and a test COD order are verified. | Safely closed (`setup` / `launch_ready = false`) |

---

## 3. Optional Post-Launch Inputs (Non-Blocking for Food Ordering Launch)

### A. Adsterra Publisher Monetization (Optional — Default Safely Disabled)
 Monitored in **Admin -> 22. Advertising & Monetization** (`$0.00` verified revenue until activated):
1. Register and verify `https://fryzar.com` in the official Adsterra Publisher Dashboard.
2. Disable all sensitive/intrusive categories in Adsterra (Adult, Gambling, Malware/Fake-Download, Sound-On, Popunder/Interstitial).
3. Copy the verified `siteId`, `publisher_zone_id`, and `https://` `script_origin` into **Admin -> 22. Advertising & Monetization**, map each zone to a canonical `placement_slot` (`home_mid_feed`, `products_footer`, `editorial_in_article`, etc.), test in `previewEnabled` mode first, and only then enable `productionApproved` + `masterEnabled`.

### B. Manual Bank / Wallet Transfer (Intentionally Disabled Under $0 Budget)
- `manual_transfer_enabled` is kept `false` because private receipt object storage (Cloudflare R2 paid plan) is intentionally omitted under the **$0.00/month** infrastructure constraint. **Cash on Delivery (COD)** is 100% complete and ready for launch.
