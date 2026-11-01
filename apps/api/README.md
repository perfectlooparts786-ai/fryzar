# FRYZAR API

Cloudflare Worker API used by the customer website, admin portal, and Android client.

## Current endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | /api/v1/health | D1 connectivity and schema readiness |
| GET | /api/v1/categories | Active bilingual categories |
| GET | /api/v1/products | Available products; accepts category and limit filters |
| GET | /api/v1/storefront-config | Public allowlisted settings |
| POST | /api/v1/orders | Guest checkout; requires Idempotency-Key |
| GET | /api/v1/orders/track/{token} | Token-protected order status and item summary |

## Checkout contract

Headers:
- Content-Type: application/json
- Idempotency-Key: unique random key, 16 to 128 allowed characters

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
    {
      "product_id": "UUID of an available product",
      "quantity": 2
    }
  ]
}
~~~

The request must not include client-authoritative prices, delivery fees, discounts, or totals. The API reads product prices, active delivery-zone rules, and store feature flags from D1.

Checkout is rejected while store_status is not open or launch_ready is false. It also requires a configured active delivery zone, available products, and enabled payment method. Manual transfer is currently disabled in store settings.

A successful response returns the order reference and one-time display of its tracking token. The token is derived with the TRACKING_SECRET Worker secret; only a SHA-256 hash is stored on the order. The idempotency replay cache stores the order response without the raw tracking token, then derives the same token for an equivalent replay.

D1 writes for the idempotency record, order, payment, order items, inventory reservations, status history, and audit record are executed as one batch. The database triggers validate current product availability and tracked stock before accepting line items.

## Rate limiting

Checkout: 5 attempts per client IP per 10 minutes.  
Order tracking: 40 reads per client IP per minute.

The client IP is hashed before it is stored in the rate-limit key. The development environment intentionally avoids failing closed when the IP header is missing or the rate-limit query fails. Production configuration must set APP_ENV=production and verify fail-closed behavior before public launch.

## Not yet implemented

- Admin authentication and owner bootstrap.
- Product/category CRUD.
- Order status transitions and cancellation/restocking.
- COD collection and payment review.
- Private payment-proof uploads.
- Staff management and RBAC.
- Customer and admin web apps.
- Android client.
