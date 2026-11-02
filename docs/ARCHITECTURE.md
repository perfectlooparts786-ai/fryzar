# FRYZAR architecture

## Current candidate architecture

The candidate is a Cloudflare-first monorepo with a shared D1 data model:

- Customer storefront: React + TypeScript, bilingual Urdu/English, RTL/LTR.
- Owner/admin portal: React + TypeScript.
- Central API: TypeScript Cloudflare Worker.
- Data: D1, accessed only by the API.
- CI/CD: GitHub Actions; preview deployment is manual, pinned to a reviewed commit.

Preview traffic flows through a single API service binding:

```text
Customer browser -> fryzar-app-preview -> fryzar-api-preview -> fryzar-preview D1
Admin browser    -> fryzar-admin-preview -> fryzar-api-preview -> fryzar-preview D1
```

The preview API binds `DB` to D1 UUID `a6f528a3-4b36-43a9-8e77-31f7105a4aeb`. Both frontend Workers bind `API` to `fryzar-api-preview` and serve built static assets with SPA fallback.

## Production boundary

The existing production Workers still use split databases:

- `fryzar-api` -> `fryzar-core` (UUID `098238a6-1bda-4735-8f21-d925c7fe32de`).
- Legacy `fryzar-app` and `fryzar-admin` -> `fryzar-production` (UUID `880b9681-4252-4db0-be44-b60c4edbdc15`).

Read-only schema inspection found the legacy frontend/admin database differs from the candidate API schema. These production resources remain untouched and are not interchangeable with preview. The candidate has not been cut over to production.

## Application and security model

- API owns price, delivery fee, totals, stock, order/payment state, and authorization.
- Checkout validates input, checks store/payment flags, requires idempotency, and batches order/payment/item/status/audit/inventory writes.
- Tracking uses a derived private token; only a hash is stored. Customer tracking omits phone and address.
- Staff passwords use PBKDF2-SHA256 hashes; sessions use opaque hashed tokens and Secure/HttpOnly/SameSite=Strict cookies; protected routes enforce roles.
- Preview uses secret bindings named `TRACKING_SECRET` and `OWNER_BOOTSTRAP_TOKEN`. The latter is configured, but owner bootstrap has not been run.
- COD remains unpaid until collection; manual transfer and proof handling remain disabled pending private storage and financial review.

## Verified project refs (2 November 2026)

- `main`: `bac292b3e99d505f69be01e62c2b3f7621708a5f`.
- `foundation/fresh-build` incorporated main in merge commit `c82152df7675b926ffdf9c53970c5d557a5da3c8`; branch comparison then showed 0 commits behind main.
- Draft PR #1 remains unmerged. PR #3 remains the archival Worker-source recovery.
- Deployed preview candidate remains `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`; later branch changes were reconciliation/documentation only.

See [deployment](DEPLOYMENT.md), [project state](PROJECT_STATE.md), [release readiness](RELEASE_READINESS.md), and [preview operations](operations/PREVIEW_ENVIRONMENT.md).
