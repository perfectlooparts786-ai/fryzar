# FRYZAR project state

**Last reconciled:** 4 November 2026  
**Repository:** `perfectlooparts786-ai/fryzar`  
**Development branch:** `foundation/fresh-build`  
**PR #1:** [open, draft, unmerged](https://github.com/perfectlooparts786-ai/fryzar/pull/1)  
**Latest verified commit:** `9d865c1` (`feat(storefront-admin): add product variants, modifier customization, coupons management, and integration test updates`).

This file is the current source-backed status summary. Dated audit documents remain historical evidence and must not override the latest source or CI result.

## Current verified state

- All unit tests (91/91 passing), worker routing tests (6/6 passing), and local D1 integration suites (migration integrity, financial integrity, backup/restore rehearsal, preview config safety, checkout concurrency, cancellation race, bootstrap, session lifecycle, retention) pass cleanly.
- CI uses Node 22 and `npm ci --ignore-scripts --no-audit --no-fund` with the committed root lockfile.
- Storefront and Admin frontend applications build without TypeScript or Vite errors (`build:storefront` and `build:admin` succeed in < 500ms).
- Isolated local Wrangler D1 suites cover checkout transactions, cancellation races, owner bootstrap, staff sessions/authorization, populated financial integrity, bounded retention, 8 ordered D1 migrations, backup/restore rehearsal, and preview config safety.
- The latest source includes a bilingual (Urdu + English, LTR + RTL) customer storefront with product customization (variants, modifier groups with option pricing and min/max selection bounds, special instructions), multi-customized-item cart, server-authoritative pricing and coupon discounts, guest COD checkout, private 64-character token tracking, customer support request, and an authenticated admin workspace with Overview, Orders, Kitchen, Catalogue (Products, Categories, Variants, Modifiers), Inventory & BOM, Procurement & Wastage, Payments, Coupons & Discounts, Financial Ledger, Delivery Zones, Riders & Dispatch, Support Ticket Inbox & Threading, Team Access, Store Settings, and Audit Logs.

## Architecture and environment boundaries

- API source: `apps/api`, preview Worker: `fryzar-api-preview`, preview D1 binding: `fryzar-preview`.
- Customer source: `apps/storefront`, preview asset Worker: `fryzar-app-preview`.
- Admin source: `apps/admin`, preview asset Worker: `fryzar-admin-preview`.
- Customer/admin Workers forward API paths to `fryzar-api-preview` through service bindings.
- Preview D1 ID: `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`.
- Production resources remain separate legacy infrastructure. Production Workers, D1, secrets, DNS, routes and payment settings remain untouched.

## Verified engineering scope

- Server-authoritative guest checkout with required idempotency, conditional stock reservation and transactional writes.
- Product variants, modifier groups/options, and selection constraint enforcement in storefront and backend API.
- Server-authoritative pricing, coupon validation (fixed/percent discounts, min order, max discount cap, usage limits), and atomic coupon redemptions.
- Cancellation concurrency protection and exactly-once stock restoration.
- Bounded order pagination and stable ordering.
- One-time first-owner bootstrap with race/rollback coverage.
- Staff password/session lifecycle and API role authorization (Owner, Manager, Kitchen, Rider, Finance, Support, Operator).
- COD collection amount guard, populated financial fixture and rollback tests.
- Financial Ledger (immutable debit/credit entries for sales, collections, purchases, wastage).
- Ingredients, recipes / BOM, suppliers, purchase orders, wastage logs, manual inventory adjustments with movement ledger & audit history.
- Riders profiles, vehicle types, status tracking, dispatch queue and order assignment.
- Support tickets, message threading, staff replies, resolution tracking.
- Bounded operational retention that excludes active sessions and financial/audit history.
- Eight-migration order/schema/index/trigger/foreign-key integrity and replay verification.
- Repeatable backup/restore rehearsal against isolated local D1 fixtures.
- Lockfile-based dependency installation and CI checks.

## Latest implementation update

The latest commit (`9d865c1`) completes product variants and modifier customization in storefront, multi-item cart with customization support, marketing & coupons management in admin UI, and integration test updates for Wrangler D1 workers. All 97 unit/worker tests and local integration suites pass cleanly.

## Known product and release gates

- The current branch head `9d865c1` is committed and pushed to GitHub `foundation/fresh-build`.
- Manual preview deployment rehearsal remains ready for authorization if requested.
- Genuine products, prices, images, delivery zones, operating hours, policies and support contact remain owner-supplied launch inputs.
- Production launch remains gated on explicit owner authorization.
