# FRYZAR project state

**Last reconciled:** 4 November 2026  
**Repository:** `perfectlooparts786-ai/fryzar`  
**Development branch:** `foundation/fresh-build`  
**PR #1:** [open, draft, unmerged](https://github.com/perfectlooparts786-ai/fryzar/pull/1)  
**Latest verified baseline CI:** [run 41841766788](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41841766788), successful on commit `f7f86b4e0da847e3635c9507640d0e887be694b5`.

This file is the current source-backed status summary. Dated audit documents remain historical evidence and must not override the latest source or CI result.

## Current verified state

- The latest verified baseline CI completed successfully. Its single validation job passed API/type and Worker routing tests, Playwright browser tests, all local D1 suites, migration integrity, backup/restore rehearsal, preview configuration safety, customer/admin builds, and all three Wrangler preview dry-runs.
- CI uses Node 22 and `npm ci --ignore-scripts --no-audit --no-fund` with the committed root lockfile.
- The Playwright suite runs against local Vite apps with synthetic, mocked API responses. It verifies the storefront setup state, English/Urdu document direction, a mocked catalogue/search/cart/guest-COD journey, and the admin sign-in/first-owner setup shell. These browser mocks are not live API or real-customer checkout tests.
- Isolated local Wrangler D1 suites cover checkout transactions, cancellation races, owner bootstrap, staff sessions/authorization, populated financial integrity, bounded retention, migration integrity/replay, and backup/restore.
- The latest source includes a bilingual customer storefront, guest COD checkout, private-token tracking, and an authenticated admin workspace with overview, orders, catalogue, inventory, COD collection, delivery-zone configuration, staff access, store settings, and the Kitchen queue.
- The Kitchen queue separates confirmed and preparing orders, reads the server-authorized order projection, displays item snapshots/quantities, and uses the API's kitchen-only `confirmed → preparing → ready` transitions. Kitchen order list/detail projections omit customer contact and delivery details.
- The new Kitchen browser regression test and the shared idempotency-error copy correction are included in the current development change; their CI result is pending until the new branch head completes CI.

## Architecture and environment boundaries

- API source: `apps/api`, preview Worker: `fryzar-api-preview`, preview D1 binding: `fryzar-preview`.
- Customer source: `apps/storefront`, preview asset Worker: `fryzar-app-preview`.
- Admin source: `apps/admin`, preview asset Worker: `fryzar-admin-preview`.
- Customer/admin Workers forward API paths to `fryzar-api-preview` through service bindings.
- Preview D1 ID: `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`.
- The manual preview deployment workflow remains pinned to historical candidate `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`. The current branch head is not confirmed deployed. No deployment is authorized by this development task.
- Production resources remain separate legacy infrastructure. Production Workers, D1, secrets, DNS, routes and payment settings must remain untouched.

## Verified engineering scope

- Server-authoritative guest checkout with required idempotency, conditional stock reservation and transactional writes.
- Cancellation concurrency protection and exactly-once stock restoration.
- Bounded order pagination and stable ordering.
- One-time first-owner bootstrap with race/rollback coverage.
- Staff password/session lifecycle and API role authorization.
- COD collection amount guard, populated financial fixture and rollback tests.
- Bounded operational retention that excludes active sessions and financial/audit history.
- Five-migration order/schema/index/trigger/foreign-key integrity and replay verification.
- Repeatable backup/restore rehearsal against isolated local D1 fixtures.
- Lockfile-based dependency installation and CI checks that do not deploy or mutate remote databases.
- Storefront and admin builds plus preview-only Wrangler dry-runs.

## Latest implementation update

The current change adds a browser-level regression for a kitchen user's privacy-limited order queue and the full `confirmed → preparing → ready` flow. It also removes an unreachable duplicate `idempotency_key_required` case in the admin error mapper so inventory and COD collection errors receive the same accurate retry-protection guidance. Await CI on this change before marking these two additions CI-verified.

## Known product and release gaps

- The current browser suite is desktop Chromium only. Responsive/mobile, screen-reader and broader keyboard acceptance remain outstanding.
- Browser tests mock API responses. A complete authenticated admin workflow against a local Worker/D1 test fixture is not yet covered.
- Guest tracking browser journey and customer-facing error/empty/offline coverage remain incomplete.
- No product variants, modifier groups, combo meals or promotion/coupon model.
- No verified R2 product-image upload pipeline or private payment-proof storage/review.
- No refund lifecycle, immutable financial adjustment ledger or full reconciliation exception workflow.
- Delivery-zone configuration exists, but rider profiles, assignment, dispatch, delivery confirmation and failed-delivery operations remain incomplete.
- Ingredient/recipe inventory, suppliers and procurement are not implemented.
- No complete support ticket API/UI, notification inbox or verified external email/SMS/WhatsApp adapters.
- No audit-log read/search interface.
- No full customer account/history model; order tracking uses a private guest token.
- Lint/static analysis is not configured as a CI gate.
- Current branch head is not deployed to preview. Remote preview D1 writes, owner bootstrap and production cutover remain separately controlled.
- Genuine products, prices, images, delivery zones, operating hours, policies and support contact remain owner-supplied launch inputs.
- This status is not a penetration-test result or production-readiness approval.

## Immediate next work

1. Verify the new Kitchen browser regression test on the current branch head.
2. Expand browser coverage to authenticated admin workflows, guest tracking, failure states and responsive layouts using isolated test data.
3. Add a lint/static quality gate and complete a documented role/permission matrix.
4. Implement product options, private media, support, audit-read, notification, delivery/rider, finance/refund, ingredient inventory and procurement workflows in independently tested slices.
5. Complete release gates and obtain explicit authorization before any preview deployment, remote D1 mutation, owner bootstrap or production operation.
