# Deployed Worker vs foundation branch comparison — 1 November 2026

## Summary

The exact deployed module bodies for all three named Cloudflare Workers were retrieved and preserved on [recovery PR #3](https://github.com/perfectlooparts786-ai/fryzar/pull/3). GitHub blob read-back returned the complete files, and the Git tree reports their expected UTF-8 byte sizes. This is source recovery only; no Worker was redeployed or configured.

The deployed architecture and the development implementation on `foundation/fresh-build` are materially different. The development branch is a newer candidate platform, not an in-place copy of the current runtime.

## Source provenance

Recovery branch: `recovery/cloudflare-worker-source-2026-11-01`  
Recovery PR: [#3](https://github.com/perfectlooparts786-ai/fryzar/pull/3)

| Worker | Deployed module | UTF-8 bytes | SHA-256 | Cloudflare version |
| --- | --- | ---: | --- | --- |
| fryzar-app | `worker.js` | 37,817 | `9f8f5942ae7faf6465a9c47fdc3eaa453cea789139e51ea76ff1cb0bc6518b62` | `91fdf9ab-ae00-4928-b5be-a1a356cc0f19` |
| fryzar-admin | `worker.js` | 33,957 | `8001452a83f3e75fc410be8e496e86dfbf9cbde53c925ff545fc9bd3b4e1765b` | `80b357d6-e6ea-49a7-a6bb-0802f7b88084` |
| fryzar-api | `index.js` | 22,511 | `58a4162ee81a221acf478e170b68a15d4e6342182ee9f68de0e23718546ac51b` | `c0f0ecf8-97ef-4768-a947-f3f56be0df8e` |

## Deployed application behavior observed from source

### Customer Worker

The deployed `fryzar-app` contains embedded HTML and handles its own storefront requests:

- `GET /api/health`
- `GET /api/public-settings`
- `GET /api/products`
- `POST /api/orders`
- `GET /track/{token}`

The source contains 19 references to `env.DB`, indicating direct D1 access from the customer Worker. It is bound to `fryzar-production`. The opening CORS configuration explicitly uses `Access-Control-Allow-Origin: *`.

### Admin Worker

The deployed `fryzar-admin` contains its own admin application/API logic and 36 references to `env.DB`. It is also bound directly to `fryzar-production`. Its bindings include `ADMIN_BOOTSTRAP_TOKEN` and `SESSION_SECRET` as secret types; values were not retrieved. It is a separate runtime, not the React admin portal from the foundation branch.

### API Worker

The deployed `fryzar-api` uses `fryzar-core` and exposes source handlers for:

- `GET /api/v1/health`
- `GET /api/v1/categories`
- `GET /api/v1/products`
- `GET /api/v1/storefront-config`
- `POST /api/v1/orders`
- `GET /api/v1/orders/track/{64-character token}`

No deployed API route was found for delivery-zone reads or the admin authentication/operations endpoints now present in development source. Runtime settings remain `APP_ENV=development` and localhost-only `ALLOWED_ORIGINS`.

## Candidate development source

The `foundation/fresh-build` branch adds a React/TypeScript customer storefront, React/TypeScript admin portal, and a larger centralized API. The candidate API contains delivery-zone endpoints and admin routes for bootstrap/login/session, orders, categories, products, inventory adjustments, delivery zones, settings, staff, COD payments, and aggregate dashboard metrics.

The candidate branch uses `fryzar-core` in Wrangler configuration. Its documented design routes both customer and admin clients to the central API instead of implementing business rules separately in each Worker. This is different from the currently deployed customer/admin Workers, which implement their own D1-backed request handlers.

## Implications

1. Do not deploy the candidate branch directly to the live Workers. First test the migration from the legacy direct-D1 customer/admin implementation to the central API topology.
2. The old customer/admin Workers use `fryzar-production`, while the central API and candidate API use `fryzar-core`. The databases have materially different schemas and only production has the observed catalogue (4 products, 3 categories, 215 tracked stock units).
3. Do not repoint bindings or migrate live data until both backup artifacts are independently accessible, D1-native restore is tested, schema/relationship reconciliation is complete, and the owner signs off on a migration/cutover plan.
4. Review and replace wildcard CORS on the customer Worker as part of a reviewed security plan. Do not hot-edit the archival source snapshot.
5. Keep manual transfer disabled, checkout closed in the candidate database, and public domain routing unchanged until end-to-end release gates pass.

## Limits

- This is a static source/metadata comparison, not a complete security review or functional penetration test.
- External HTTP smoke tests could not be completed in this tool environment. This does not prove that the workers.dev hostnames are unavailable.
- The development CI passes mocked D1 tests and builds, but does not establish real D1 atomicity/concurrency, real auth sessions, browser E2E, or production runtime health.
- No Worker, D1 schema/data/binding, DNS, route, or secret was changed during this comparison.
