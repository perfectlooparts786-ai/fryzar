# FRYZAR

**FRYZAR** is a fresh-build, bilingual Urdu and English ordering platform for food, grocery, and local products.

The target is a complete product: customer website, Android app, admin portal, secure API, database, inventory, orders, payments, support, and production operations.

## Current build

- Private GitHub repository: perfectlooparts786-ai/fryzar
- Active development branch: foundation/fresh-build
- New database: fryzar-core, Cloudflare D1, APAC
- API Worker: fryzar-api, deployed to its isolated workers.dev hostname
- API foundation: TypeScript source and four public read endpoints
- Customer web: planned React + TypeScript application
- Admin web: planned React + TypeScript application
- Android: planned Kotlin + Jetpack Compose application
- Currency: PKR, stored as integer paisa
- Languages: Urdu (RTL) and English (LTR)
- Customer registration: not required for browsing or guest checkout

The initial schema is applied to the new D1 database. The API source has passed a local strict TypeScript check and six local smoke/unit scenarios. Live HTTP behavior remains unverified from the current tool environment.

## Legacy resources

Older resources named fryzar-app, fryzar-admin, and fryzar-production were found in Cloudflare. They are treated as legacy/unverified resources, not as the source of truth for this fresh build. They have not been modified.

The new D1 database fryzar-core is separate. Existing fryzar.com domain-verification records must be preserved.

## Development principles

1. Do not base the new product on unverified demo code.
2. Keep old deployments and data untouched until replacement is tested.
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
~~~

Before running future remote migrations, reconcile Wrangler migration tracking because the first schema migration was applied directly through the Cloudflare D1 API.

## Project documents

- docs/PROJECT_STATE.md
- docs/ARCHITECTURE.md
- docs/IMPLEMENTATION_PLAN.md
- docs/TASK_BACKLOG.md
- docs/SECURITY_REVIEW.md
- docs/TESTING.md
- docs/DEPLOYMENT.md
- docs/RELEASE_READINESS.md

## License

No open-source license has been selected. All rights are reserved by the project owner unless a license is added.
