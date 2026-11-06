# FRYZAR Browser End-to-End (E2E) Suite

**Last updated:** 7 November 2026  
**Runner:** `@playwright/test` (Chromium, deterministic mocked API isolation)  
**Result:** **8 / 8 tests passing** (`npm run test:e2e`)

## 1. Spec Files & Coverage

### `tests/e2e/smoke.spec.cjs` (4 tests)
1. Customer storefront setup-state rendering without remote dependencies.
2. Instant language and document direction toggle between English (`dir="ltr"`) and Urdu (`dir="rtl"`).
3. Admin unauthenticated sign-in and first-owner bootstrap form rendering.
4. Kitchen Display System (KDS) role-scoped workflow (`confirmed -> preparing -> ready`) with redacted customer PII.

### `tests/e2e/storefront-ordering.spec.cjs` (1 test)
5. Complete desktop discovery -> category filter -> text search -> product detail modal -> `Add to basket` -> basket drawer -> guest COD delivery checkout -> confirmation & 64-hex tracking token.

### `tests/e2e/platform-complete.spec.cjs` (3 comprehensive platform tests)
6. **17-Page Storefront, SEO & Restricted-Route Ad Safety:** Verifies `/guides` index & `/guides/:slug` reader, canonical `<link>` and `hreflang="en"` / `hreflang="ur"` tags, and asserts **zero `[data-ad-slot]` elements** on `/basket`, `/checkout`, `/order-confirmation`, `/track`, `/support`, `/privacy-policy`, `/terms`, `/refund-policy`, and `/delivery-policy` even when `masterAdsEnabled = true`.
7. **Mobile Viewport (`375×812`) Variant + Required Modifier + Coupon + Guest COD + Live Tracking + Urdu RTL:** Verifies `Add to basket` stays disabled until required modifier (`Garlic Mayo`) is chosen, validates coupon `SAVE100` in checkout, places COD order, inspects `/track/:64-hex-token` (`Preparing`), and switches to Urdu RTL.
8. **27-Module Owner Control Center & Adsterra Emergency Kill Switch:** Asserts all **27 navigation modules** render with **zero `.feature-placeholder` stubs**, exercises **22. Advertising & Monetization -> Emergency Disable All Ads**, verifies `POST /api/v1/admin/advertising/kill-switch` flips status to `SAFELY DISABLED (DEFAULT)`, and verifies **27. System Health** displays `0009_platform_completion.sql`.

## 2. Running Locally

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
npm run test:e2e
```
