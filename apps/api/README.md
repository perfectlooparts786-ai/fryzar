# FRYZAR API

Cloudflare Worker API source for the customer website, admin portal, and a future Android client. The canonical implementation in this branch is `src/index.ts`.

> **Deployment status:** This is the current GitHub candidate source, not proof of the current Cloudflare runtime. The deployed Worker snapshot is preserved separately in recovery PR #3. Its current API surface is older and does not include the expanded admin routes below. No deployment of this branch is implied.

## Public endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | D1 connectivity and schema readiness |
| GET | `/api/v1/categories` | Active bilingual categories |
| GET | `/api/v1/products` | Available products with category/limit filters |
| GET | `/api/v1/storefront-config` | Public allowlisted store settings |
| GET | `/api/v1/delivery-zones` | Active delivery areas and server-side fees |
| POST | `/api/v1/orders` | Guest checkout; requires `Idempotency-Key` |
| GET | `/api/v1/orders/track/{token}` | Private token-based order status and safe summary |

## Admin endpoints in candidate source

| Method | Path | Capability |
|---|---|---|
| POST | `/api/v1/admin/bootstrap-owner` | One-time owner bootstrap |
| POST | `/api/v1/admin/login` | Staff login |
| POST | `/api/v1/admin/logout` | Session revocation/logout |
| GET | `/api/v1/admin/session` | Current staff session |
| GET | `/api/v1/admin/metrics` | Role-protected aggregate metrics |
| GET | `/api/v1/admin/orders` | Role-aware paginated order list |
| GET/PATCH | `/api/v1/admin/orders/{id}` and status action | Order detail/status operations |
| GET/POST/PATCH | `/api/v1/admin/categories` | Category management |
| GET/POST/PATCH | `/api/v1/admin/products` | Product management |
| GET/POST | `/api/v1/admin/inventory/adjustments` | Auditable stock adjustments |
| GET | `/api/v1/admin/inventory/movements` | Inventory movement history |
| GET/POST/PATCH | `/api/v1/admin/delivery-zones` | Delivery-zone management |
| GET/PATCH | `/api/v1/admin/settings` | Allowlisted store settings |
| GET/POST/PATCH | `/api/v1/admin/staff` | Staff lifecycle and role management |
| POST | `/api/v1/admin/staff/{id}/reset-password` | Staff password reset and session revocation |
| GET | `/api/v1/admin/payments` | COD payment queue |
| POST | `/api/v1/admin/payments/cod-collection` | Idempotent COD collection |

All admin routes except bootstrap/login/logout/session require an active database-backed staff session and server-side role authorization. Kitchen order responses omit customer contact and address fields. Check `src/index.ts` for the exact route and role contract.

## Checkout contract

Headers:
- `Content-Type: application/json`
- `Idempotency-Key`: unique random key, 16 to 128 allowed characters

JSON body:

~~~json
{
  "customer_name": "Customer Name",
  "customer_phone": "03001234567",
  "delivery_address": "Full delivery address",
  "delivery_zone_id": "UUID of an active delivery zone",
  "customer_language": "ur",
  "payment_method": "cod",
  "notes": "",
  "items": [
    { "product_id": "UUID of an available product", "quantity": 2 }
  ]
}
~~~

The request must not include client-authoritative prices, delivery fees, discounts, or totals. The API reads product prices, active delivery-zone rules, and store feature flags from D1. Checkout is rejected unless store status is open and launch readiness is enabled. It also requires an active delivery zone, available products, and an enabled payment method.

The API currently supports COD collection. Manual transfer remains disabled. Private proof storage/review, verified transfer state transitions and refund workflow are not release-ready and must not be enabled.

## Integrity and security behavior in candidate source

- Mandatory idempotency key, canonical request hash and 24-hour replay record.
- One D1 batch for idempotency, order, payment, order-item snapshots, stock reservation, status event and audit record.
- Product availability/stock validation and non-negative stock constraints in the core schema.
- HMAC-derived private tracking token; only SHA-256 token hash is stored.
- Tracking response omits customer phone and delivery address.
- IP-hash rate limits: checkout 5 per IP per 10 minutes; tracking 40 per IP per minute; admin login 5 per IP per 15 minutes.
- Salted PBKDF2-SHA256 passwords, one-time owner bootstrap claim, hashed opaque sessions, HttpOnly/Secure/SameSite=Strict cookies, and session revocation.
- Role-aware order access, inventory adjustment ledger, and conditional cancellation stock restoration.

The code uses mocked D1 tests in CI. These do not prove live D1 transaction rollback, concurrent-write behavior, or deployed Worker integration.

## Configuration

`wrangler.toml` currently targets the isolated `fryzar-core` database and development mode. Its allowed origins are local development origins only. Before any deployment, use a reviewed environment-specific configuration, exact approved origin list, and a configured `OWNER_BOOTSTRAP_TOKEN` secret. Do not set production mode or change bindings as part of a routine CI run.

## Current limitations

- The latest candidate source is not deployed to the live Worker; the runtime is behind the GitHub branch.
- No production or preview deployment workflow is present in this repository branch.
- Core D1 currently has no real products, categories, delivery zones, staff or orders. Do not fabricate business records.
- Real D1 rollback/concurrency tests, browser E2E, live Worker authentication and external HTTP smoke tests remain outstanding.
- Manual-transfer proof storage/review is blocked until private storage is approved and verified.
- No Android Kotlin/Compose project or APK is present.
- Domain routes, TLS and final customer/admin hostnames are not configured.

See `docs/PROJECT_STATE.md`, `docs/SECURITY_REVIEW.md`, `docs/RELEASE_READINESS.md`, and the repository audit PRs for current evidence.