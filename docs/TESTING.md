# FRYZAR Testing & Verification Matrix

**Last verified:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`

## 1. Automated Verification Summary (100% Passing)

| Suite | Command | Scope & Assertions | Verified Result |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | Strict TS check across `apps/api` (`index.ts` + `platform-modules.ts`) | **PASS** |
| **API Unit Suite** | `npm run test:api` | **107 unit tests** across auth, checkout, inventory, RBAC, variants, delivery, payment-proof ownership, cumulative refund caps, kitchen wastage, rider horizontal isolation, reconciled Adsterra contract, SEO sitemap/robots, PII-free telemetry, kill switch, and archive guards | **107 / 107 PASS** |
| **Worker Routing & Headers Suite** | `npm run test:workers` | **7 routing & security-header tests** verifying `/api/*`, `/sitemap.xml`, `/robots.txt`, SPA fallback, `X-Frame-Options`, `X-Content-Type-Options`, `X-Robots-Tag`, and preview Wrangler configs | **7 / 7 PASS** |
| **Preview Config Safety** | `npm run test:config-safety` | Asserts all Wrangler configs bind exclusively to `-preview` targets and never reference production IDs | **PASS** |
| **D1 Migrations Suite** | `npm run test:integration:migrations` | Applies all **9 migrations**, verifies **46 tables**, **39 indexes**, **2 triggers**, `0` FK violations, and idempotent replay | **PASS** |
| **Legacy Catalogue Migration** | `npm run test:integration:legacy-migration` | Verifies lossless migration of **3 categories, 4 products, and 215 stock units**, replay idempotency, and live checkout | **PASS** |
| **Full Operational E2E (D1)** | `npm run test:integration:full-e2e` | End-to-end local D1 lifecycle: bootstrap -> catalogue -> variants/modifiers -> coupon -> COD checkout -> tracking -> kitchen -> rider -> COD collection -> ledger -> support -> audit | **PASS** |
| **Hardening & Edge Cases** | `npm run test:integration:hardening` | Expired/capped coupons, stock exhaustion, invalid state transitions, RBAC denials, premature COD collection guard | **PASS** |
| **Checkout Concurrency** | `npm run test:integration:local` | Concurrent stock race, idempotency replay/conflict, forced late-statement atomic rollback | **PASS** |
| **Cancellation Race** | `npm run test:integration:cancellation` | Concurrent cancellation single-winner restock and audit consistency | **PASS** |
| **Owner Bootstrap Race** | `npm run test:integration:bootstrap` | Concurrent first-owner claim single-winner guarantee and rollback | **PASS** |
| **Staff Session Lifecycle** | `npm run test:integration:session` | PBKDF2 login, hashed cookies, expiry, revocation on role/password/deactivation, kitchen/finance PII projections | **PASS** |
| **Financial Integrity** | `npm run test:integration:financial` | Paisa line/subtotal/discount/delivery arithmetic and mismatched COD amount rejection | **PASS** |
| **Operational Retention** | `npm run test:integration:retention` | Bounded 100-row expiry cleanup preserving active sessions, orders, payments, and audit logs | **PASS** |
| **Local Backup & Restore** | `npm run test:integration:backup-restore` | SHA-256 manifest verification across persisted local D1 snapshot & 9-migration ledger restore | **PASS** |
| **Playwright Browser E2E** | `npm run test:e2e` | **11 browser E2E specs** across `375×812`, `768×1024`, and `1280×800` viewports: 17-page storefront, EN/UR overflow checks, `Escape` accessibility, cart persistence, minimum-order gate, variants/modifiers/coupon/COD/tracking, kitchen KDS, 27-module Owner Control Center, Owner Setup Readiness Checklist, real `MonetizationConfig`, and Rider role scoping | **11 / 11 PASS** |
| **Production Web Builds** | `npm run build` | TypeScript + Vite production bundles (`< 320ms` each) | **PASS** |

## 2. Reproducing Full Verification Locally

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:config-safety
npm run test:e2e
npm run test:integration:migrations
npm run test:integration:legacy-migration
npm run test:integration:full-e2e
npm run test:integration:hardening
npm run test:integration:financial
npm run test:integration:backup-restore
npm run test:integration:local
npm run test:integration:cancellation
npm run test:integration:bootstrap
npm run test:integration:session
npm run test:integration:retention
npm run build:storefront
npm run build:admin
```
