# FRYZAR — Performance, Bundle Budget & Accessibility Verification Report

**Document ID:** `PERFORMANCE-ACCESSIBILITY-REPORT`  
**Audit Date:** `2026-11-07`  
**Release Candidate Branch:** `release/fryzar-production-ready`

---

## 1. Verified Production Build & Worker Bundle Metrics

Measured directly from `npm run build` (`Vite 8.3.5`) and `wrangler deploy --dry-run` (`Wrangler 4.156.0`):

| Deliverable | Raw Size | Gzipped Transfer Size | Startup / Edge Metric | Assessment |
| --- | ---: | ---: | --- | --- |
| **Customer Storefront HTML** (`dist/storefront/index.html`) | `1.17 kB` | **`0.58 kB`** | Served from Cloudflare Edge Assets (`0 ms` Worker compute) | Excellent |
| **Customer Storefront CSS** (`dist/storefront/assets/*.css`) | `38.75 kB` | **`9.10 kB`** | Immutable content-hashed edge asset | Excellent |
| **Customer Storefront JS** (`dist/storefront/assets/*.js`) | `345.74 kB` | **`102.22 kB`** | Zero heavy UI/state bloat (React 19 + custom lightweight router/ads/i18n) | Well within `< 150 kB` gzipped mobile budget |
| **Admin Portal HTML** (`dist/admin/index.html`) | `0.54 kB` | **`0.33 kB`** | Served from Cloudflare Edge Assets | Excellent |
| **Admin Portal CSS** (`dist/admin/assets/*.css`) | `33.59 kB` | **`7.28 kB`** | Immutable content-hashed edge asset | Excellent |
| **Admin Portal JS** (`dist/admin/assets/*.js`) | `437.69 kB` | **`109.64 kB`** | All 27 operational views compiled in a single fast-cached bundle | Excellent |
| **Central API Worker** (`fryzar-api` / `fryzar-api-preview`) | `252.97 KiB` | **`48.50 KiB`** | **Cold Worker Startup Time: `2 ms`** (measured on Cloudflare deployment) | Ultra-fast (`< 10 ms` cold start) |
| **Customer Edge Proxy Worker** (`fryzar-app*`) | `1.28 KiB` | **`0.56 KiB`** | **Cold Worker Startup Time: `2 ms`** | Minimal |
| **Admin Edge Proxy Worker** (`fryzar-admin*`) | `1.32 KiB` | **`0.57 KiB`** | **Cold Worker Startup Time: `1 ms`** | Minimal |

---

## 2. Core Web Vitals & Network Efficiency Safeguards

1. **Zero Render-Blocking External Fonts or Ad Scripts:**
   - `apps/storefront/index.html` and `apps/admin/index.html` load zero blocking third-party stylesheets or synchronous scripts.
   - Adsterra loader (`apps/storefront/src/ads/adsterraLoader.ts`) uses `IntersectionObserver` (`200px` rootMargin), `async` script injection, and only activates when `effectiveActive === true` on permitted editorial/browse routes.
2. **Cumulative Layout Shift (CLS) Protection:**
   - `AdSlot.tsx` collapses cleanly (`return null`) when monetization is disabled or unconfigured, avoiding empty reserved whitespace or sudden reflows on mobile screens.
   - Product cards and modals define explicit aspect-ratio / min-height containers for imagery and fallback placeholders.
3. **Database Query Latency & Indexing:**
   - `39` targeted SQLite indexes cover product listing (`idx_products_category_active`), order lookup (`idx_orders_created_at`, `idx_orders_status`), tracking token lookup, session hash verification, rate-limit windows, and financial ledger aggregation.
   - Public list endpoints clamp `limit` (`<= 100`) and enforce non-negative bounded `offset` before touching D1.

---

## 3. Accessibility (WCAG 2.1 AA) & Responsive UX Verification

| Criterion | Implementation & Automated Proof | Status |
| --- | --- | --- |
| **Responsive Breakpoints (`375px`, `768px`, `1280px`)** | Verified in `tests/e2e/phase2-acceptance.spec.cjs` across both English (`dir="ltr"`) and Urdu (`dir="rtl"`): `document.documentElement.scrollWidth <= window.innerWidth + 1` on all viewports (`0` horizontal overflow). | **PASS** |
| **Keyboard & Modal Accessibility** | Dialogs (`role="dialog"`, `aria-modal="true"`, accessible `aria-label`) close reliably on `Escape` key press (verified in Playwright E2E for both Product Details and Basket modals). Interactive controls use native `<button>`, `<input>`, `<select>`, and `<label>` elements. | **PASS** |
| **Screen Reader & Status Semantics** | Live feedback banners, form validation errors, loading indicators, and store setup/paused notices use semantic headings (`h1`–`h3`), `aria-live="polite"` / `role="alert"` regions, and explicit button labels (`Switch language`, `Basket (n)`). | **PASS** |
| **Color Contrast & Focus Visibility** | Deep emerald (`#164c3b`) and warm slate foregrounds on cream/white surfaces meet WCAG AA contrast ratios (`>= 4.5:1`), with visible `:focus-visible` outlines on keyboard navigation. | **PASS** |
| **SEO & Crawl Hygiene** | Canonical tags, OpenGraph/Twitter metadata, `JSON-LD` structured data (`apps/storefront/src/seo.ts`), dynamic `/sitemap.xml`, environment-aware `/robots.txt` (`Disallow: /` on preview; private routes disallowed on production), and `X-Robots-Tag: noindex, nofollow, noarchive` on admin and API endpoints. | **PASS** |
