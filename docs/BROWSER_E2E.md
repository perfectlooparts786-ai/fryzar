# FRYZAR Browser End-to-End (E2E) Suite

**Last updated:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`  
**Runner:** `@playwright/test` (Chromium, deterministic API isolation + zero-runtime-error monitors)  
**Result:** **11 / 11 tests passing** (`npm run test:e2e`)

## 1. Spec Files & Coverage

### `tests/e2e/smoke.spec.cjs` (4 tests)
1. Customer storefront setup-state rendering without remote dependencies.
2. Instant language and document direction toggle between English (`dir="ltr"`) and Urdu (`dir="rtl"`).
3. Admin unauthenticated sign-in and first-owner bootstrap form rendering.
4. Kitchen Display System (KDS) role-scoped workflow (`confirmed -> preparing -> ready`) with redacted customer PII.

### `tests/e2e/storefront-ordering.spec.cjs` (1 test)
5. Complete desktop discovery -> category filter -> text search -> product detail modal -> `Add to basket` -> basket drawer -> guest COD delivery checkout -> confirmation & 64-hex tracking token.

### `tests/e2e/platform-complete.spec.cjs` (3 comprehensive platform tests)
6. **17-Page Storefront, SEO & Restricted-Route Ad Safety:** Verifies `/guides` index & `/guides/:slug` reader, canonical `<link>` and `hreflang="en"` / `hreflang="ur"` tags, and asserts **zero ad elements** on `/basket`, `/checkout`, `/order-confirmation`, `/track`, `/support`, `/privacy-policy`, `/terms`, `/refund-policy`, and `/delivery-policy` even when `masterAdsEnabled = true`.
7. **Mobile Viewport (`375×812`) Variant + Required Modifier + Coupon + Guest COD + Live Tracking + Urdu RTL:** Verifies `Add to basket` stays disabled until required modifier (`Garlic Mayo`) is chosen, validates coupon `SAVE100` in checkout, places COD order, inspects `/track/:64-hex-token` (`Preparing`), and switches to Urdu RTL.
8. **27-Module Owner Control Center & Adsterra Emergency Kill Switch:** Asserts all **27 navigation modules** render with **zero `.feature-placeholder` stubs**, exercises **22. Advertising & Monetization -> Emergency Disable All Ads**, verifies `POST /api/v1/admin/advertising/kill-switch` flips status to `SAFELY DISABLED (DEFAULT)`, and verifies **27. System Health** displays `0009_platform_completion.sql`.

### `tests/e2e/phase2-acceptance.spec.cjs` (3 Phase 2 acceptance tests)
9. **Responsive LTR/RTL Overflow, Alias Ad Mapping, Persistence, Out-of-Stock, Minimum Order & `Escape` Dismissal:** Verifies `0` horizontal overflow across `375×812`, `768×1024`, and `1280×800` in both English (`ltr`) and Urdu (`rtl`), verifies seeded `home_below_hero` maps to `[data-ad-preview="home_mid_feed"]`, verifies out-of-stock button lock, `localStorage` basket persistence across `page.reload()`, delivery-zone minimum-order gate, and `Escape` keyboard dismissal on Product Details and Basket dialogs.
10. **Owner Setup Readiness Checklist, Wastage DB Constraints & Real `MonetizationConfig` Contract:** Verifies `OwnerSetupReadinessCard` (`2 / 6 gates complete` in setup mode), DB-aligned wastage reasons (`spilled`), and real backend `/api/v1/admin/advertising/overview` rendering + canonical `placement_slot` selector with zero runtime errors.
11. **Rider Role Scoping & Self-Service Queue:** Verifies `rider` staff login scopes navigation strictly to `Riders & Dispatch` + `Notifications`, renders `RiderSelfAssignment` (`/api/v1/rider/assignments`), progresses `assigned -> picked_up`, and produces **zero `403` console/network errors**.

## 2. Running Locally

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
npm run test:e2e
```
