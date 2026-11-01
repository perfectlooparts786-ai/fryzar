# FRYZAR architecture

## Target components
- Customer website: React + TypeScript, bilingual Urdu/English, RTL/LTR.
- Customer Android app: Kotlin + Jetpack Compose, planned.
- Admin portal: React + TypeScript, staff authentication and operations.
- API: Cloudflare Workers + TypeScript.
- Database: Cloudflare D1.
- Private payment media: R2 planned, not activated.
- Source control: private GitHub monorepo.

## Request/data flow

~~~text
Customer website ───┐
Android app ────────┼── HTTPS /api/v1 ──> Cloudflare Worker API
Admin portal ───────┘                         │
                                             └── D1 (authoritative data)
Future private payment-proof uploads ───────────> Private object storage
~~~

## Trust boundaries
Clients do not own product prices, delivery fees, discounts, totals, stock, order/payment status or permissions. The API recalculates values from trusted D1 records and checks staff authorization on sensitive operations.

Browsing and guest checkout do not require customer registration. A high-entropy tracking token is derived with HMAC from the order ID; only its SHA-256 hash is stored on the order. The raw token is shown after checkout and never included in logs. Customer tracking responses omit phone/address.

Staff authentication uses PBKDF2-SHA256 salted password hashes, one-time owner-bootstrap claim, hashed opaque session tokens, an 8-hour expiry and HttpOnly/Secure/SameSite=Strict cookie. Server-side role checks protect the admin APIs. The first bootstrap also requires a separate Cloudflare secret.

## Checkout
1. Validate JSON size/shape and customer fields.
2. Require a unique idempotency key and hash normalized request payload.
3. Check store launch/payment flags.
4. Load active delivery zone and product records.
5. Calculate subtotal, delivery fee and total in integer paisa on the server.
6. Submit idempotency record, order, COD payment, item snapshots, stock reservation, status history and audit record in one D1 batch.
7. Return a private order tracking token.

Database constraints/triggers reject invalid product state, duplicate payment rows, duplicate inventory movements and negative tracked stock. Real concurrency/rollback tests remain outstanding.

## Order administration
- Order listing/detail is restricted to owner, manager, operator and kitchen roles.
- Kitchen SQL projection excludes phone and address.
- Status transitions are checked against a state machine and staff role.
- Owner/manager cancellation restores tracked stock, adds inventory movements, status history and audit data in a conditional batch.
- Finance, rider and support access require separate purpose-built assignment/payment/support endpoints.

## Payments
- COD starts as unpaid, not paid. Collection workflow is pending.
- Manual transfer stays disabled until private proof upload and authorized review are complete.
- Proof upload never automatically verifies payment.
- No payment gateway or bank details are fabricated.

## Deployment boundaries
- Development database is fryzar-core.
- The legacy fryzar-production database and fryzar-app/fryzar-admin Workers remain untouched.
- The Worker deployment is behind current GitHub source and must be updated only after CI passes.
- Domain/DNS routing is not configured. Preserve the Apple verification TXT record.
