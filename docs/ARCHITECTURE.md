# FRYZAR architecture

## Product surfaces
- Customer website: product discovery, cart, guest checkout, order tracking, support.
- Customer Android app: native Kotlin + Jetpack Compose client using the same API.
- Admin portal: staff operations, catalog, inventory, orders, payment review, delivery, settings, support, audit.

## Request and data flow

~~~text
Customer Web ─────┐
Android App ──────┼── HTTPS /api/v1 ──> Cloudflare Worker API
Admin Portal ─────┘                         │
                                           ├── Cloudflare D1 (authoritative data)
                                           └── Private object storage (planned)
~~~

Clients do not own prices, final totals, stock, order transitions, payment state, or permissions. The API validates all input and applies business rules.

## Platform
| Area | Choice |
|---|---|
| API | Cloudflare Worker + TypeScript |
| Database | Cloudflare D1 |
| Web clients | React + TypeScript (planned) |
| Android | Kotlin + Jetpack Compose (planned) |
| Schema migrations | Versioned SQL and Wrangler migration history |
| Private media | R2 (planned, not activated) |
| Source control | Private GitHub monorepo |

## Data ownership

D1 is authoritative for catalog, price, availability, delivery zones, orders, stock, payment state, staff access, and audit events. Money uses integer paisa. The API recalculates all totals.

## Customer identity

Browsing and guest checkout do not require customer registration. Order tracking uses an HMAC-derived high-entropy token. A SHA-256 hash is stored on the order, not the raw token. The HMAC secret is a Worker secret and is not committed to GitHub. Idempotency response cache entries store the order response without the raw tracking token.

Staff accounts are separate and must use server-enforced authorization.

## Order and inventory flow

Checkout validates the request and mandatory Idempotency-Key, canonicalizes and hashes its payload, verifies the store is open, checks payment feature flags, loads an active delivery zone, and reads current product prices. Client-supplied amounts are ignored.

The order, payment row, immutable order-item snapshots, stock reservations, status event, idempotency record, and audit event are submitted in one D1 batch. A unique idempotency index prevents a duplicate request from creating a second order. Database triggers reject unavailable products and insufficient stock. Unique inventory indexes are prepared to prevent duplicate order reservation/cancellation movements.

The cancellation transition and stock restoration operation are not implemented yet.

## Payments

COD creates a payment row with status unpaid. It remains due until an authorized staff action records collection. Manual transfer is disabled in settings. A future transfer workflow requires a payment record, transaction reference, private proof upload, authorized reviewer, amount/reference checks, replay protection, and audit history. Uploading proof never marks an order paid.

## Rate limiting and origins

Checkout and tracking have D1-backed IP-hash rate limiting. The Worker remains in development mode and only allows localhost browser origins. Before production, switch to fail-closed rate limit behavior and configure exact customer/admin origins.

## Free-first approach

Prefer Workers and D1 free allowances. Optimize indexed D1 queries. Do not enable R2, Workers Paid, paid gateways, or third-party paid services without checking eligibility and obtaining approval for possible charges.
