# FRYZAR Remaining Blockers & Explicit Risk Separation

**Last reconciled:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`

---

## 1. Software Engineering Blockers: **NONE (0)**

All software, database migration, security, RBAC, bilingual EN/UR storefront, 27-module Owner Control Center, SEO, Adsterra safety/governance, CI, and isolated preview deployment tasks are **100% complete and verified**.

---

## 2. Non-Software Launch Blockers (Human / Owner Actions Only)

These items cannot and must not be fabricated or executed autonomously without the Owner:

| ID | Category | Item | Why Autonomous Execution Is Prohibited | Exact Resolution Path |
|---|---|---|---|---|
| **B-01** | Governance | **Explicit Production Cutover Approval** | Modifying `main`, `fryzar-core`, `fryzar-api`, `fryzar-app`, `fryzar-admin`, or `fryzar.com` routes without explicit authorization violates production safety rules. | Owner reviews preview acceptance report and grants written cutover approval. |
| **B-02** | Business Data | **Real Support Phone, WhatsApp, Hours & Delivery Zones** | Entering fake Pakistani phone numbers, delivery fees, or delivery areas would mislead real customers. | Owner configures real values in **Admin -> 14. Delivery Zones** and **25. Store Settings** (tracked by the Overview **Owner Setup Readiness Checklist**). |
| **B-03** | Business Data | **Final Menu Catalogue, Pricing & Product Photography** | Only 4 legacy items (215 stock units) exist in `fryzar-production`; final launch menu items, variants, PKR prices, and HTTPS image URLs require business confirmation. | Import the 4 legacy items losslessly during cutover and add/verify full menu in **Admin -> 4. Products** & **6. Gallery**. |
| **B-04** | Security | **First-Owner Bootstrap Claim** | Claiming the single-use `first_owner` bootstrap token creates the permanent root Owner credential. | Owner claims `first_owner` directly on `/api/v1/admin/bootstrap` using `OWNER_BOOTSTRAP_TOKEN`. |

---

## 3. Optional Post-Launch Enhancements (Not Blocking Ordering Launch)

| ID | Feature | Current State | Activation Requirement |
|---|---|---|---|
| **O-01** | **Adsterra Live Ad Serving** | Safely disabled (`masterEnabled = false`, `$0.00` verified revenue, `0` external ad requests). | Owner registers `fryzar.com` with Adsterra, obtains verified `siteId` + `publisher_zone_id`s + `https://` `script_origin`, tests in `previewEnabled`, and enables in **Admin -> 22. Advertising & Monetization**. |
| **O-02** | **Manual Bank / Wallet Transfer Receipts** | Safely disabled (`manual_transfer_enabled = false`); endpoint hardened with rate-limit + tracking-token ownership verification. | Remains disabled under the **$0.00/month** architecture (Cloudflare R2 requires a paid plan/billing method). **Cash on Delivery (COD)** handles 100% of launch orders at $0 cost. |
| **O-03** | **Online Card / Wallet Payment Gateway** | Not enabled (`cod_enabled = true`). | Requires merchant account onboarding, webhook signing secrets, and explicit Owner approval. |
