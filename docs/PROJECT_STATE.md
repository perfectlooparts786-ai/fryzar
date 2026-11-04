# FRYZAR project state

**Last reconciled:** 3 November 2026  
**Repository:** `perfectlooparts786-ai/fryzar`  
**Development branch:** `foundation/fresh-build`  
**Code changes under Phase 3 verification:** `d420cae9f260fc1aa2e7abc741bce96c71eaa44a` (migration catalog and local D1 migration verification added; final CI pending)  
**PR #1:** [open, draft, unmerged](https://github.com/perfectlooparts786-ai/fryzar/pull/1)

This file is the concise current-state source of truth. Historical audit narratives remain in the dated audit documents; do not interpret old status statements as current.

## Current verified state

- Final-head CI run [41569582732](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41569582732) passed on the current branch HEAD. The earlier audit-head run [41568524358](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41568524358) also passed.
- CI uses Node 22 and `npm ci --ignore-scripts --no-audit --no-fund`. Root `package-lock.json` (lockfileVersion 3) is committed. The lockfile-backed CI install has passed. Windows-specific installation has not been independently verified.
- Existing local Wrangler D1 suites cover checkout, cancellation, owner bootstrap, staff sessions, populated financial integrity and retention cleanup. A seventh local D1 suite now verifies ordered migrations, schema objects, indexes, triggers, foreign keys and migration replay; its CI result is pending.
- Storefront and admin production builds pass in CI. API, customer Worker and admin Worker Wrangler preview dry-runs pass in CI.
- The storefront includes bilingual catalogue/search, cart, delivery selection, guest COD checkout, order confirmation and private-token tracking. A product-detail dialog includes focus entry/containment, Escape dismissal and focus restoration.
- Admin includes authenticated role-aware overview, orders, catalogue, inventory, COD payments, delivery zones, team and store settings.
- CI validation now has per-branch/PR concurrency cancellation, a 45-minute job timeout, npm dependency caching, and checkout credentials disabled. This workflow hardening and the new migration suite await final-head CI.
- CI currently does not run lint or browser-based E2E tests.

## Architecture and environment boundaries

- API: `apps/api`, Worker `fryzar-api-preview`, D1 binding `fryzar-preview`.
- Customer: `apps/storefront` served by `fryzar-app-preview`.
- Admin: `apps/admin` served by `fryzar-admin-preview`.
- Customer/admin Workers forward API paths to `fryzar-api-preview` through service bindings.
- Preview D1 ID: `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`.
- The manual preview deployment workflow remains pinned to historical candidate `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. Current branch HEAD is **not confirmed deployed**.
- Production resources are separate legacy infrastructure. Do not alter production Workers, D1, secrets, DNS, routes or payment settings without a separately approved cutover plan.

## Completed engineering scope

- Server-authoritative guest checkout with idempotency, conditional inventory reservation and transactional writes.
- Cancellation concurrency and exactly-once stock restoration.
- Bounded admin order pagination (limit 1–50, offset 0–10,000).
- One-time first-owner bootstrap with concurrency protection.
- Staff password/session lifecycle and role authorization.
- COD collection amount guard, populated financial fixtures and rollback tests.
- Daily bounded operational retention cleanup with migration 0005 indexes.
- Lockfile-based reproducible dependency installation in CI.
- Product detail dialog keyboard focus management.

## Latest implementation update (4 November 2026)\n\n- Added an admin Kitchen queue with separate confirmed and preparing lanes. It loads order details through the existing role-authorized detail endpoint, displays bilingual product-name snapshots and quantities, and supports the existing kitchen-only `confirmed → preparing → ready` transitions.\n- The API already omits customer phone/address/name for kitchen-role list and detail responses; the new screen does not expose those fields. The API remains the authorization boundary.\n- This source change is not yet CI-verified and is not deployed.\n\n## Known product and release gaps

- No browser E2E or real-device UX acceptance evidence.
- No configured lint gate.
- No verified R2 product image upload pipeline.
- No variants/modifiers or promotion model.
- No manual-transfer proof submission, private storage or finance review workflow; keep manual transfer disabled.
- No refund lifecycle/reconciliation workflow.
- No complete support ticket API/UI.
- No notification inbox or external email/SMS/WhatsApp adapter.
- No audit-log read/search UI.
- No customer account identity/history model; customer order lookup is guest private-token tracking.
- No fresh deployment of the current branch HEAD to preview.
- No remote owner bootstrap; do not invoke it as part of routine development.
- Genuine store data, products, delivery zones, policies and contact information remain owner-supplied launch inputs.
- This state is not a penetration-test result or production-readiness approval.

## Immediate next work

1. Add browser E2E infrastructure against isolated local/test fixtures, never live customer data.
2. Verify the customer guest journey and admin workflows in a browser.
3. Keep the manual deployment workflow's historical candidate isolated. Its pinned commit predates the root lockfile, so `npm install` remains appropriate there unless a separately reviewed replacement candidate is selected.
4. Complete private payment-proof/refund design before enabling manual transfer.
5. Add support, notification and audit-read operations.
6. Complete review and rehearsal gates before any preview deployment is separately authorized.
