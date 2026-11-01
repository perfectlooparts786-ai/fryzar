# Legacy deployed runtime findings — 1 November 2026

## Current launch state

Both databases currently indicate the store is not open:

| Database | Store state | Launch ready | Manual transfer | COD | Delivery fee |
| --- | --- | --- | --- | --- | ---: |
| `fryzar-production` | `setup` | `no` | `no` | not explicitly configured in selected legacy keys | 20,000 paisa |
| `fryzar-core` | `setup` | `false` | `false` | `true` | 0 paisa |

The live application Worker checks the production store state and launch-ready flag before creating orders. The core API also checks its store state and launch-ready setting. With these settings, the store is not configured to accept live orders. Manual transfer is explicitly disabled in both databases.

The following code findings are therefore latent launch blockers, not evidence that customers are currently placing orders. Current observed order counts are zero in both databases; staff-user counts are also zero.

## Confirmed findings in deployed customer Worker

Source: recovery snapshot `recovery/cloudflare-snapshots/2026-11-01/fryzar-app/worker.js`.

### High — unguarded stock decrement on legacy database

At source line 98 the checkout handler pre-reads each product and checks `stock_qty < requested quantity`. It later adds this update to the D1 batch:

```sql
UPDATE products
SET stock_qty = stock_qty - ?
WHERE id = ? AND stock_qty IS NOT NULL
```

The production `products.stock_qty` column has no `CHECK(stock_qty >= 0)` constraint. The update has no `AND stock_qty >= ?` guard and does not check affected-row count. Concurrent checkouts that both pass the earlier read can therefore decrement the same stock below zero. The later write batch is atomic, but the earlier stock validation is outside it and the legacy schema does not enforce a non-negative balance.

**Required fix before launch:** use a conditional atomic stock reservation with a non-negative database constraint, check every affected row, and ensure order, items, idempotency, payment record, and inventory movement are committed or rolled back together. Add real D1 concurrency tests.

### High — checkout does not create a payment record

The deployed customer Worker contains no reference to `payment_records` or `payments` in its checkout module. It inserts an order, order items, status history, notification, optional idempotency record, and inventory movements. The admin Worker reads pending payment information from `payment_records`.

If manual transfer were enabled, the customer checkout path can create an order marked `pending_verification` without inserting the payment row needed by the admin payment-review queue. The database currently has `manual_transfer_enabled=no`; keep it disabled until this gap is fixed and an end-to-end payment review flow passes.

### Medium — idempotency key is optional at the server boundary

The customer browser currently generates and sends an `Idempotency-Key`, but the deployed Worker accepts a missing key and only performs the lookup/insert when one is supplied. The database does not require every checkout to have an idempotency record. Calls outside the current browser UI, retries from a modified client, or future clients that omit the header can create duplicate orders.

**Required fix:** require and validate the idempotency key server-side for every checkout; persist it and the canonical request hash as part of the same transaction.

### Medium — displayed delivery fee is hard-coded in browser UI

The embedded customer UI calculates delivery as `20000` paisa whenever the cart is non-empty. Server checkout reads `delivery_fee_paisa` from `store_settings`. These can diverge when the admin changes the fee, causing the amount shown to the customer before submission to differ from the server-calculated order total.

**Required fix:** load delivery fee/minimum order from a public, validated server config endpoint and share the same response with the cart and checkout display. The server must remain authoritative.

## Confirmed findings in deployed admin Worker

Source: recovery snapshot `recovery/cloudflare-snapshots/2026-11-01/fryzar-admin/worker.js`.

### High — order listing is not role-scoped

At source line 54 the route first requires any valid active staff session, then returns:

```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 100
```

There is no role check or field projection in this read handler. The `orders` row contains customer phone and delivery address among other sensitive order fields. The status mutation route defines role-specific transition permissions, but that does not restrict who can read all order records.

**Required fix:** define read permissions for each staff role, return only role-appropriate fields, and add negative RBAC tests for customer contact/delivery data.

### High — no failed-login throttling in deployed admin login handler

At source line 49 the login handler loads the staff record and verifies PBKDF2 credentials, but no login-attempt counter, rate limit, lockout/backoff, or authentication-failure record is applied in that route. The legacy production schema also lacks `auth_login_attempts`. The candidate core schema contains an `auth_login_attempts` table, but that does not protect the currently deployed admin Worker while it remains bound to `fryzar-production`.

**Required fix:** implement a durable rate-limit/failure counter and source/network controls; test sustained failed login attempts against the actual Worker and database.

### High — cancellation does not restore stock in the deployed admin status handler

At source line 55 the status handler updates the order, writes status history, notifications, and audit log. The deployed admin module contains no stock-restoration update or `order_cancelled` inventory movement. Therefore setting an order to `cancelled` does not restore the stock reserved by checkout.

**Required fix:** implement a single transactional, idempotent cancellation operation that restores stock once, records an immutable movement, and prevents repeated cancellation from increasing stock more than once.

## Target API versus currently used storefront path

The deployed `fryzar-app` embeds its customer UI and handles `/api/products` and `/api/orders` itself, with direct access to `fryzar-production`. Its browser code calls relative paths such as `/api/products` and `/api/orders`; it does not call the central API.

The separate deployed `fryzar-api` exposes `/api/v1/health`, catalogue, storefront-config, checkout, and private tracking routes against `fryzar-core`. Its checkout implementation requires an idempotency key, writes a payment row, uses delivery-zone settings, and relies on the core schema's non-negative stock constraint. However, the current production storefront does not use this API, and the core database currently has zero products and categories and is not launch-ready.

The `foundation/fresh-build` candidate adds the admin API and React clients but has not been deployed. The customer/admin workers, central API, development code, and two databases must be migrated as one reviewed architecture, not switched independently.

## Prioritized remediation

1. Keep both live stores closed until a production migration is validated; do not enable manual transfer.
2. Resolve architecture/database choice after D1-native restore, full schema/data reconciliation, and owner approval.
3. Use one canonical API for customer/admin business operations; remove duplicate Worker-local business logic only after a safe cutover.
4. Fix atomic stock reservation, order cancellation restoration, payment-record creation, and mandatory checkout idempotency.
5. Add admin RBAC read scopes and failed-login throttling.
6. Replace wildcard CORS with verified production origins and resolve the API's development-only origin configuration.
7. Make delivery fee display use the same public configuration that checkout validates.
8. Add real D1 concurrency/rollback, payment-review, RBAC, login-throttle, and browser E2E tests.

## Evidence limits

These findings are from static source inspection and read-only schema/config queries. They are not penetration-test results or live exploit demonstrations. The currently configured closed-store flags prevent new checkout in the observed state. No Worker, D1 binding, schema, data, DNS, route, or secret was changed during this review.
