# FRYZAR architecture

## Current environment split

FRYZAR's candidate implementation uses an isolated three-Worker preview topology:

- Customer site: React + TypeScript, bilingual Urdu/English with RTL/LTR support.
- Admin portal: React + TypeScript with staff authentication and operations.
- API: TypeScript Cloudflare Worker.
- Preview data: Cloudflare D1 database `fryzar-preview`.
- Deployment source: private GitHub monorepo and GitHub Actions.

The customer Worker (`fryzar-app-preview`) and admin Worker (`fryzar-admin-preview`) send `/api` and `/api/*` through the Cloudflare Service Binding `API` to `fryzar-api-preview`. The API binds to D1 as `DB` and uses the preview database UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`. The frontends serve built static assets with SPA fallback.

The separate legacy production topology is currently:
- `fryzar-api` → D1 `fryzar-core` (UUID `098238a6-1bda-4735-8f21-d925c7fe32de`).
- `fryzar-app` and `fryzar-admin` → D1 `fryzar-production` (UUID `880b9681-4252-4db0-be44-b60c4edbdc15`).

Read-only schema inspection found the legacy frontend/admin database has a different schema from the candidate API database. The preview architecture is internally consistent; the legacy Worker/database bindings must not be changed or treated as interchangeable. The project has not cut over production traffic to the candidate implementation.

## Request and data flow

~~~text
Customer storefront ──┐
                      ├── /api/* ──> Preview API Worker ──> Preview D1
Owner/admin portal ───┘                    │
                                          └── authoritative business rules
~~~

The storefront, admin portal and API use one candidate schema. Clients do not own product prices, delivery fees, discounts, totals, stock, order/payment status or staff permissions. The API derives values from D1 and enforces authorization on sensitive operations.

## Authentication and tracking

Browsing and guest checkout do not require customer registration. An order tracking token is derived with HMAC from the order ID; the order stores only its SHA-256 hash. Raw tokens are returned to the customer once and must not be logged. Customer tracking responses omit phone and address.

Staff authentication uses PBKDF2-SHA256 salted password hashes, a one-time owner-bootstrap claim, hashed opaque session tokens, an 8-hour expiry, and an HttpOnly/Secure/SameSite=Strict cookie. Server-side role checks protect admin APIs. The first owner bootstrap also requires the preview-only `OWNER_BOOTSTRAP_TOKEN` secret.

## Checkout

1. Validate request size, shape and customer fields.
2. Require an idempotency key and hash the normalized payload.
3. Check store readiness and payment flags.
4. Load active delivery-zone and product records.
5. Calculate totals in integer paisa on the server.
6. Write the idempotency record, order, payment, item snapshots, stock reservation, status and audit records in one D1 batch.
7. Return a private order tracking token.

Database constraints and triggers enforce valid state, unique payments/inventory movements and tracked stock bounds. CI covers concurrent checkout, idempotent replay, payload conflict and transaction rollback using Wrangler's local D1 runtime. The preview deployment smoke test verified remote API/D1 health and that checkout remains closed.

## Operations and payments

- Order list/detail and status changes are role-checked.
- Kitchen SQL projection excludes phone and address.
- Owner/manager cancellation restores tracked stock and records inventory, status and audit changes.
- COD starts unpaid. Manual transfer remains disabled pending private proof storage and authorized review.
- No payment gateway, private object storage, or customer Android app is active in this phase.

## Deployment boundaries

The `main` branch's manual preview workflow checks out a pinned reviewed commit and verifies preview-only resource names, IDs, environment secrets and service bindings before deployment. It applies migrations only to `fryzar-preview`, deploys the three preview Workers, and runs HTTP smoke tests. PR workflows do not receive deployment secrets.

The candidate was deployed and smoke-tested on 2 November 2026. The store is still in setup mode and checkout remains closed. Production Workers, D1 databases, DNS and routes remain outside the preview workflow. The candidate foundation PR remains draft and needs reconciliation with `main` before merge.

See [preview operations](operations/PREVIEW_ENVIRONMENT.md) and [deployment and recovery](DEPLOYMENT.md) for verified resource details and procedures.
