# FRYZAR Customer Storefront Journey & Bilingual UX QA Report

**Last verified:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`  
**Live Storefront Preview URL:** `https://fryzar-app-preview.perfectlooparts786.workers.dev` (Version `16bc6c30-96ed-42b7-bdfa-26dac85b1791`)

---

## 1. Responsive Viewport & Bilingual Directionality Matrix

Verified via automated Playwright Chromium E2E (`tests/e2e/phase2-acceptance.spec.cjs`, `tests/e2e/platform-complete.spec.cjs`) across `375×812`, `768×1024`, and `1280×800`, and via live Chrome verification against `https://fryzar-app-preview.perfectlooparts786.workers.dev` across `390×844` and `1440×900`:

| Viewport | Language & Direction | Horizontal Overflow (`scrollWidth > innerWidth`) | Console / Page Errors | Ad Safety on Restricted Routes | Result |
|---|---|---|---|---|---|
| `375×812` (Mobile SE/Mini) | English (`dir="ltr"`, `lang="en"`) | `false` | `0` | `0` ad slots | **PASS** |
| `375×812` (Mobile SE/Mini) | Urdu (`dir="rtl"`, `lang="ur"`, Noto Nastaliq Urdu) | `false` | `0` | `0` ad slots | **PASS** |
| `390×844` (Live Preview Mobile) | English (`dir="ltr"`) & Urdu (`dir="rtl"`) | `false` (`390 === 390`) | `0` | `0` ad slots / `0` ad requests | **PASS** |
| `768×1024` (Tablet Portrait) | English (`dir="ltr"`) & Urdu (`dir="rtl"`) | `false` | `0` | `0` ad slots | **PASS** |
| `1280×800` (Laptop Desktop) | English (`dir="ltr"`) & Urdu (`dir="rtl"`) | `false` (`1280 === 1280`) | `0` | `0` ad slots | **PASS** |
| `1440×900` (Live Preview Desktop) | English (`dir="ltr"`) & Urdu (`dir="rtl"`) | `false` (`1440 === 1440`) | `0` | `0` ad slots / `0` ad requests | **PASS** |

---

## 2. 17-Page Customer Route Acceptance Ledger

| # | Route | Primary Customer Function | SEO & Structured Data | Ad Policy | Verified Status |
|---|---|---|---|---|---|
| 1 | `/` | Storefront home, setup/open status banner, featured items, category pills, guide highlights | Canonical + `hreflang` + `Organization` & `WebSite` JSON-LD | `home_mid_feed` only (disabled by default) | **PASS** |
| 2 | `/categories` | Bilingual category browse cards | Canonical + `BreadcrumbList` JSON-LD | `category_footer` only | **PASS** |
| 3 | `/products` | Full searchable/sortable menu & catalogue | Canonical + `BreadcrumbList` JSON-LD | `products_footer` only | **PASS** |
| 4 | `/products/:slug` | Standalone product detail, variants, required/optional modifiers, quantity | Canonical + `Product` & `Offer` (`PKR`) JSON-LD | `product_below_related` only | **PASS** |
| 5 | `/search?q=` | Bilingual instant search (`name_en`, `name_ur`, SKU, description) | `noindex` on query states | `search_below_results` only | **PASS** |
| 6 | `/promotions` | Active verified coupon cards with one-click code copy | Canonical + `BreadcrumbList` | `promotions_sponsor_card` below store promos | **PASS** |
| 7 | `/basket` | Dedicated basket page + coupon code validator + zone minimum-order gate | `noindex` | **STRICT ZERO-AD ZONE** | **PASS** |
| 8 | `/checkout` | Guest COD delivery form, delivery zone selector, server-authoritative PKR summary | `noindex` | **STRICT ZERO-AD ZONE** | **PASS** |
| 9 | `/order-confirmation` | Order number (`FZ-...`) + private 64-hex tracking URL | `noindex` | **STRICT ZERO-AD ZONE** | **PASS** |
| 10 | `/track` & `/track/:token` | Privacy-safe live status timeline (`pending` -> `delivered`) with zero PII leaked | `noindex` | **STRICT ZERO-AD ZONE** | **PASS** |
| 11 | `/support` | Customer support ticket submission (`POST /api/v1/support/tickets`) | Canonical + bilingual metadata | **STRICT ZERO-AD ZONE** | **PASS** |
| 12 | `/about` | FRYZAR culinary, hygiene, and fresh-oil standards | Canonical + `Organization` JSON-LD | `about_footer` only | **PASS** |
| 13 | `/privacy-policy` | Customer data minimization, session/cookie policy, ad consent disclosure | Canonical + legal metadata | **STRICT ZERO-AD ZONE** | **PASS** |
| 14 | `/terms` | PKR pricing, COD acceptance, and order cancellation terms | Canonical + legal metadata | **STRICT ZERO-AD ZONE** | **PASS** |
| 15 | `/refund-policy` | Quality replacement and PKR refund policy | Canonical + legal metadata | **STRICT ZERO-AD ZONE** | **PASS** |
| 16 | `/delivery-policy` | Live delivery zone table (city, PKR fee, minimum order, ETA range) | Canonical + legal metadata | **STRICT ZERO-AD ZONE** | **PASS** |
| 17 | `/editorial` & `/guides/:slug` | Bilingual Food & Kitchen Hygiene Guides (4 seeded articles in `fryzar-preview`) | Canonical + `Article` JSON-LD | `editorial_in_article` & `editorial_footer` | **PASS** |

---

## 3. Positive & Negative Edge-Case Journey Coverage

1. **Setup / Closed Store Gate:** Live preview (`store_status = "setup"`, `launch_ready = false`) displays a clear bilingual setup banner and prevents premature checkout (`POST /api/v1/orders` also enforces `409 store_not_open` server-side).
2. **Out-of-Stock Item Protection:** Clicking a product with `is_available = 0` or `stock_qty = 0` opens Product Details with `"Add to basket"` disabled; server-side atomic stock reservation + `prevent_negative_product_stock` SQLite trigger block race-condition overselling.
3. **Required Modifier Group Enforcement:** Both the Product Details modal CTA and `POST /api/v1/orders` (`min_selection` / `max_selection`) block submission until required choices (e.g., sauce selection) are satisfied.
4. **Basket Persistence Across Reload:** Cart state (`fryzar-cart-v2` in `localStorage`) preserves items, variants, modifiers, and quantities across full browser reloads.
5. **Delivery Zone Minimum-Order Gate:** When subtotal (`PKR 480.00`) is below the selected zone's `minimum_order_paisa` (`PKR 600.00`), the Basket displays the exact minimum-order warning and disables `"Continue to checkout"` until quantity increases (`PKR 960.00 >= PKR 600.00`).
6. **Coupon Validation & Server-Authoritative Pricing:** Valid coupons (`SAVE100`) apply exact integer paisa discounts; expired or capped coupons return deterministic errors; client-tampered prices are ignored by the API.
7. **Keyboard Accessibility (`Escape` & Focus Management):** Product Detail modal traps `Tab` focus and restores prior focus on close; pressing `Escape` cleanly dismisses Product Details, Basket drawer, and Checkout dialog (when not mid-submission).
