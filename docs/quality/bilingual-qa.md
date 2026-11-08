# FRYZAR — Bilingual (English + Urdu RTL) Quality Assurance Report

**Document ID:** `BILINGUAL-QA-REPORT`  
**Audit Date:** `2026-11-07`  
**Supported Locales:** English (`en`, LTR `dir="ltr"`) & Urdu (`ur`, RTL `dir="rtl"`)  
**Verification Method:** Static Dictionary Coverage Audit + Playwright Chromium RTL Switching E2E

---

## 1. Bilingual Architecture Verification

| Capability | Storefront (`apps/storefront`) | Admin Portal (`apps/admin`) | Database (`D1`) | Status |
| --- | --- | --- | --- | --- |
| Document Direction & `lang` Attribute | Dynamically toggles `document.documentElement.lang` (`"en"` / `"ur"`) and `document.documentElement.dir` (`"ltr"` / `"rtl"`) with `localStorage` persistence (`fryzar_lang`). | Bilingual catalogue, editorial, and store setting inputs (`name_en`/`name_ur`, `description_en`/`description_ur`, `title_en`/`title_ur`, `store_name_en`/`store_name_ur`). | Dedicated `_en` and `_ur` columns on `categories`, `products`, `product_variants`, `modifier_groups`, `modifier_options`, `delivery_zones`, and `editorial_posts`. | **PASS** |
| Urdu Typography Stack | Noto Nastaliq Urdu / system Arabic-Urdu fallback stack with adjusted line-height (`1.75`–`1.9`) in `apps/storefront/src/styles.css` so Nastaliq ascenders/descenders never clip inside buttons, badges, or cards. | Form inputs for Urdu fields support native RTL cursor direction and UTF-8 persistence without mojibake. | Full UTF-8 storage verified across local and remote D1 instances. | **PASS** |
| Bidirectional Numeric & Code Formatting | Prices (`PKR 650`), order numbers (`FRZ-...`), phone numbers (`+92...`), timestamps, and coupon codes preserve readable LTR token isolation inside RTL paragraphs and tables. | Integer `paisa` inputs and PKR summaries render unambiguously. | Exact integer `paisa` (`INTEGER NOT NULL`). | **PASS** |

---

## 2. Page-by-Page Bilingual & RTL Verification Matrix (All 17 Storefront Routes)

| # | Route | English (`en` LTR) | Urdu (`ur` RTL) | Verified UX / Layout Behaviour |
| ---: | --- | :---: | :---: | --- |
| 1 | `/` (Homepage) | PASS | PASS | Hero CTA, trust strip, featured categories/products, store status badge, and header nav flip cleanly to RTL. |
| 2 | `/menu` (Product Listing & Search) | PASS | PASS | Search bar placeholder, clear action, empty search state, category pills, and product cards render `name_ur` with graceful fallback to `name_en` when `name_ur` is empty. |
| 3 | `/category/:slug` (Category View) | PASS | PASS | Breadcrumbs, category header (`name_ur`, `description_ur`), and filtered product cards align right-to-left without horizontal overflow. |
| 4 | `/product/:slug` (Product Details) | PASS | PASS | Variant radio chips, required/optional modifier checklists, quantity stepper, stock status, and Add-to-Basket CTA mirror cleanly. |
| 5 | `/basket` (Basket & Coupon) | PASS | PASS | Line-item modifiers, quantity controls, coupon input + **Apply / Remove** actions, subtotal/discount/total breakdown align properly in RTL. |
| 6 | `/checkout` (Guest Checkout) | PASS | PASS | Customer name, phone, delivery zone selector, address textarea, notes, COD summary, and validation error alerts support both English and Urdu labels. |
| 7 | `/order-confirmation` | PASS | PASS | Order number, private tracking link CTA, itemized receipt, and payment status render clearly in both locales. |
| 8 | `/track` & `/track/:token` | PASS | PASS | Private order status badge, **sanitized status timeline with stage timestamps**, and optional manual payment proof form render cleanly in EN & UR. |
| 9 | `/guides` (Editorial Hub) | PASS | PASS | Bilingual food guides list (`title_ur`, `summary_ur`) seeded in `0007_customer_payment_proofs_and_editorial_seed.sql` renders native Urdu editorial copy. |
| 10 | `/guides/:slug` (Guide Article) | PASS | PASS | Full article typography (`body_ur`), reading layout, and `"اشتہار"` / `"Sponsored"` label support verified. |
| 11 | `/about` | PASS | PASS | Honest brand & fresh-kitchen preparation overview without fabricated awards or fake testimonials. |
| 12 | `/contact` | PASS | PASS | Live store contact channels & operating hours rendered from `store_settings`. |
| 13 | `/support` | PASS | PASS | Support ticket submission form (subject, category, order number, message) + confirmation reference verified in both locales. |
| 14 | `/faq` | PASS | PASS | Ordering, COD payment, delivery zone, and cancellation Q&A verified in EN & UR. |
| 15 | `/privacy` | PASS | PASS | Data minimization, cookie/session usage, and customer privacy rights documented cleanly. |
| 16 | `/terms` & `/refund-policy` | PASS | PASS | Ordering terms, kitchen prep cancellation window, and COD/refund rules clearly stated. |
| 17 | `/delivery-policy` & `/cookies` | PASS | PASS | Zone-based delivery fee/ETA policy and essential vs. optional storage disclosures verified. |

---

## 3. Graceful Fallback & Automated Browser Proof

1. **Missing Translation Fallback:** Whenever an admin creates a category, product, variant, modifier, or editorial post with `name_en` populated and `name_ur` blank (or null), the storefront helper (`localizedText(locale, en, ur)`) falls back deterministically to `name_en` — never rendering `undefined`, `null`, or blank buttons.
2. **Ad Disclosure Localization:** `apps/storefront/src/ads/AdSlot.tsx` renders `"Sponsored"` in English and `"اشتہار"` in Urdu when an ad slot is active.
3. **Playwright E2E Verification (`e2e/platform.spec.ts`):** Automated Chromium browser tests toggle the storefront language switcher to Urdu (`اردو`), assert `html[dir="rtl"]` and `html[lang="ur"]`, navigate catalogue and operational routes, and switch back to English (`dir="ltr"`) with zero console or page errors.
