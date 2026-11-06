# FRYZAR Platform Architecture & System Inventory

**Last updated:** 7 November 2026  
**Source branch:** `feature/fryzar-master-transformation`  
**Infrastructure cost:** **$0.00/month** (Cloudflare Workers Free + D1 Free + Workers Static Assets + Service Bindings)

## 1. Runtime Topology

FRYZAR enforces a strict **single-API-owns-D1** architecture:

```text
Customer Browser ──► fryzar-app-preview (Static Assets + Proxy) ──┐
                                                                  ├──► Service Binding (API) ──► fryzar-api-preview ──► fryzar-preview D1
Owner/Staff Browser ► fryzar-admin-preview (Static Assets + Proxy)┘
```

- **Customer Worker (`apps/customer-worker`):** Serves `dist/storefront` via Cloudflare Workers Static Assets with SPA fallback and forwards `/api`, `/api/*`, `/sitemap.xml`, and `/robots.txt` (`run_worker_first`) directly to the central API Worker over zero-latency internal Service Bindings.
- **Admin Worker (`apps/admin-worker`):** Serves `dist/admin` via Workers Static Assets and forwards `/api` and `/api/*` to the central API Worker.
- **Central API Worker (`apps/api`):** Sole holder of the `DB` D1 binding, `TRACKING_SECRET`, and `OWNER_BOOTSTRAP_TOKEN`. Implements PBKDF2-SHA256 authentication, `__Host-` HttpOnly/SameSite=Strict session cookies, exact `Origin` validation, D1-backed IP/identity rate limits, server-authoritative PKR paisa pricing, atomic `DB.batch()` transactions, and daily bounded operational retention (`17 2 * * *`).

## 2. Customer Storefront (`apps/storefront` — 17 Routes)

Mobile-first React 19 + TypeScript application supporting instant **English (`ltr`)** and **Urdu (`rtl`)** switching, persistent `localStorage` basket (`fryzar-cart-v2`), dynamic `<title>` / canonical / `hreflang` / OpenGraph / JSON-LD (`Organization`, `WebSite`, `Product`, `BreadcrumbList`, `Article`), and modular Adsterra slots (`apps/storefront/src/ads/`):

1. `/` — Home (Hero, store readiness banner, featured products, category pills, editorial highlights)
2. `/categories` — Categories directory
3. `/products` — Complete menu & catalogue with category filters and sort
4. `/products/:slug` — Dedicated product detail view (gallery, variants, required/optional modifiers, quantity, JSON-LD `Product`)
5. `/search?q=` — Dedicated bilingual product search
6. `/promotions` — Active verified coupon campaigns with one-tap copy
7. `/basket` — Full-page & drawer shopping basket with coupon validation and zone minimum checks
8. `/checkout` — Guest COD delivery checkout with server-authoritative total verification
9. `/order-confirmation` — Order number and private 64-hex tracking link
10. `/track` & `/track/:token` — Live privacy-safe order status timeline (zero PII exposed)
11. `/support` — Customer support request form creating tracked tickets
12. `/about` — About FRYZAR culinary & quality standards
13. `/privacy-policy` — Privacy, cookie, and ad-consent disclosures
14. `/terms` — Terms & conditions (PKR pricing, COD rules)
15. `/refund-policy` — Cancellation & refund policy
16. `/delivery-policy` — Live delivery zone fee, minimum order, and ETA table
17. `/guides` & `/guides/:slug` — Bilingual Food Guides & Editorial articles

## 3. Owner & Staff Control Center (`apps/admin` — 27 Functional Modules)

Authenticated, role-aware operations portal (`apps/admin/src/App.tsx` + `apps/admin/src/ExtendedModules.tsx`) with **zero placeholder screens**:

1. **Executive Overview** — Live KPIs, low-stock alerts, operational warnings, recent audit feed
2. **Orders & Printable Receipts** — Paginated order queue, status transitions, cancellation with atomic restock, and thermal/A4 `PrintableReceiptModal`
3. **Kitchen Display (KDS)** — Privacy-redacted prep cards (`confirmed -> preparing -> ready`)
4. **Products** — Full bilingual product CRUD, availability toggles, featured flags, archive-safe delete guard
5. **Categories** — Bilingual category CRUD and display ordering
6. **Product Media Gallery** — Multi-image HTTPS URL gallery manager (`primary`, alt text, sort order)
7. **Variants & Modifiers** — Multi-size variants and min/max/required modifier groups & options
8. **Finished Stock Adjustments** — Idempotent manual stock ledger (`recount`, `restock`, `damage`, `correction`)
9. **Raw Ingredients** — Ingredient stock units, reorder thresholds, and unit costs
10. **Recipes / BOM** — Product-to-ingredient Bill of Materials recipe mapping
11. **Suppliers** — Supplier directory and contact management
12. **Purchase Orders** — PO creation and atomic stock-receiving workflow
13. **Wastage Logs** — Audited raw/finished wastage recording with financial impact
14. **Delivery Zones** — Zone fees, minimum order thresholds, cities, and ETAs
15. **Riders & Dispatch** — Rider roster, availability, and order dispatch assignment
16. **Customers Directory** — Aggregated customer order counts and lifetime spend (`owner`/`manager` only)
17. **Payments & COD** — Idempotent COD cash collection verification (`delivered` orders)
18. **Refunds & Reversals** — Audited full/partial PKR refund ledger
19. **Financial Ledger & Reports** — Immutable debit/credit ledger plus daily & monthly revenue/expense reconciliation
20. **Promotions & Coupons** — Percentage/fixed coupon CRUD, expiry, max-discount caps, usage limits
21. **Editorial & Food Guides CMS** — Bilingual guide publishing (`draft`/`published`)
22. **Advertising & Monetization** — 12-control Adsterra Governance Center, zone manager, report importer, telemetry monitor, and 1-click **Emergency Disable All Ads** kill switch
23. **SEO & Sitemap Controls** — Per-route metadata overrides, indexing flags, live `/sitemap.xml` & `/robots.txt` links
24. **Support Inbox** — Threaded customer ticket triage and staff replies
25. **Store Settings** — Bilingual store identity, WhatsApp, COD toggle, setup/paused operational status
26. **Staff, Roles & Audit Logs** — 7-role RBAC user lifecycle, session revocation, password resets, and searchable audit trail + staff notifications
27. **System Health & Diagnostics** — Live D1 migration ledger (`0009`), table counts, secret presence booleans, Free-tier quota monitor, and diagnostic events

## 4. Core API Module Map

- `apps/api/src/index.ts` — Core security, CORS, rate limiting, auth/bootstrap, catalog, atomic checkout, order state machine, inventory adjustments, delivery zones, COD payments, staff RBAC, and scheduled retention cron.
- `apps/api/src/platform-modules.ts` — Extended platform handlers: variants/modifiers, coupons, ingredients/BOM/POs/wastage, riders/dispatch, support threading, financial ledger/reconciliation/refunds, customers directory, product images, editorial CMS, SEO `/sitemap.xml` & `/robots.txt`, Adsterra monetization & kill switch, and system health diagnostics.
