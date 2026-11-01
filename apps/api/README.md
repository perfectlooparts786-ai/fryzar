# FRYZAR API

Cloudflare Worker API used by the customer website, admin portal, and Android client.

## Implemented in this foundation branch

| Method | Path | Purpose |
|---|---|---|
| GET | /api/v1/health | Database and migration readiness |
| GET | /api/v1/categories | Active bilingual categories |
| GET | /api/v1/products | Available products; category and limit filters |
| GET | /api/v1/storefront-config | Public allowlisted store settings |

Checkout, order tracking, admin authentication, product management, inventory mutations, payment operations, and staff management are not implemented yet.

The Worker is bound to the new D1 database fryzar-core using DB. Never change this configuration to the legacy fryzar-production database.

ALLOWED_ORIGINS is an exact comma-separated allowlist. Authenticated APIs must not use wildcard CORS.
