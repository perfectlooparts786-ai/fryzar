# FRYZAR architecture

## Product surfaces

- Customer website: food, grocery, and local product discovery, cart, guest checkout, order tracking, and support.
- Customer Android app: native Kotlin + Jetpack Compose client using the same API.
- Admin portal: staff operations, catalog, inventory, orders, payment review, delivery, settings, support, and audit.

## Request and data flow

~~~text
Customer Web ─────┐
Android App ──────┼── HTTPS /api/v1 ──> Cloudflare Worker API
Admin Portal ─────┘                         │
                                           ├── Cloudflare D1 (authoritative data)
                                           └── Private object storage (planned)
~~~

Clients do not own prices, final totals, stock, order transitions, payment state, or permissions. The API validates input and applies all business rules.

## Platform

| Area | Choice | Reason |
|---|---|---|
| API | Cloudflare Worker + TypeScript | Existing account and edge runtime |
| Database | Cloudflare D1 | Relational product, inventory, order, payment, staff, and audit data |
| Web clients | React + TypeScript (planned) | Typed API integration and maintainability |
| Android | Kotlin + Jetpack Compose (planned) | Native Android user experience |
| Migrations | Versioned SQL files | Reviewable and repeatable schema changes |
| Media | Private R2 bucket (planned) | Payment evidence; account activation and free eligibility must be checked first |
| Source | Private GitHub monorepo | One version-controlled source of truth |

## Domain model

The domain zone exists but has no Worker route. Production hostnames will be selected only after the web/API topology is finalized. Initial API testing uses an isolated workers.dev endpoint.

Prefer same-site web routing where practical to simplify secure admin cookies and reduce CORS complexity. Android uses the same versioned API.

## Data ownership

D1 is authoritative for products, categories, price, availability, delivery zones, orders, stock, payment state, staff access, and audit events. Money is stored as integer paisa. The API calculates all order totals.

## Customer identity

Browsing and guest checkout do not require customer registration. Order tracking uses a random unguessable token, with only its hash stored server-side. Staff accounts are separate.

## Inventory and orders

Tracked stock is reserved atomically during order placement. Every stock change creates an inventory movement. Cancellation must restore the reservation exactly once. Order creation requires an idempotency key and payload hash.

## Payments

COD remains due until staff records collection. Manual transfer requires a payment record, transaction reference, private proof upload, authorized reviewer, amount/reference validation, and audit history. Uploading proof never marks an order paid.

Manual transfer remains disabled until private storage and the full review workflow pass testing. No payment gateway is assumed.

## Free-first approach

Use Workers and D1 free allowances where practical. Optimize indexed D1 queries. Do not enable R2, Workers Paid, third-party paid services, or paid gateways without checking eligibility and getting approval for possible charges.
