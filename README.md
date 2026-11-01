# FRYZAR

**FRYZAR** is a fresh-build bilingual Urdu and English ordering platform for food, grocery, and local products.

The target is a complete product: customer website, Android app, admin portal, secure API, database, inventory, orders, payments, support, and production operations.

## Current build

- Private GitHub repository: `perfectlooparts786-ai/fryzar`
- Active development branch: `foundation/fresh-build`
- New database: `fryzar-core`, Cloudflare D1, APAC
- API Worker: `fryzar-api`, deployed to its isolated `workers.dev` hostname
- API: public catalog/config routes plus initial guest-order checkout and tracking endpoints
- Customer website: not built yet
- Admin dashboard: not built yet
- Android application: not built yet
- Currency: PKR, integer paisa in backend calculations
- Languages: Urdu (RTL) and English (LTR)
- Guest checkout: designed; currently blocked while store remains in setup mode

## Important API behavior

- Checkout accepts product IDs and quantities, never customer-supplied prices.
- The API calculates totals from D1 product and delivery-zone records.
- An idempotency key is mandatory for checkout.
- Order, payment, line items, stock movement, and audit records are written in one D1 batch.
- Tracking uses a derived HMAC credential; only its SHA-256 hash is stored on the order.
- Customer tracking responses omit phone numbers and delivery addresses.
- COD starts as unpaid. Manual transfer is rejected by the current store setting.
- The store is still `setup` with launch readiness disabled. No real orders should be accepted yet.

## Infrastructure separation

Older resources named `fryzar-app`, `fryzar-admin`, and `fryzar-production` remain untouched and are treated as legacy/unverified resources. The new application targets the separate `fryzar-core` database and `fryzar-api` Worker.

The existing `fryzar.com` Apple domain-verification TXT record must be preserved. No production domain route is configured.

## Development principles

1. Do not base the new product on unverified demo code.
2. Keep old deployments and data untouched until the replacement is tested.
3. Prefer free tiers. No paid plans or billable services without approval.
4. Keep development and production data separate.
5. Never commit secrets, payment proof files, or customer personal data.
6. Server-side pricing, inventory, payment state, and authorization are authoritative.
7. Keep manual transfer disabled until secure proof storage and payment review are fully tested.
8. Do not declare production readiness without evidence.

## API quick start

~~~bash
npm install
npm run db:migrate:local
npm run dev:api
npm run typecheck
npm run test:api
~~~

The first two remote migrations were applied to the new D1 database and reconciled in Wrangler's migration history. Future remote migrations must still be reviewed before application.

## Project documents

- `docs/PROJECT_STATE.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/TASK_BACKLOG.md`
- `docs/SECURITY_REVIEW.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`
- `docs/RELEASE_READINESS.md`

## License

No open-source license has been selected. All rights are reserved by the project owner unless a license is added.
