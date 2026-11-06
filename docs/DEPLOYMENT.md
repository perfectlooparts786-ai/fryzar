# FRYZAR Preview Deployment & Operational Verification

**Last deployed & verified:** 7 November 2026  
**Branch:** `feature/fryzar-master-transformation`  
**Cloudflare Account:** `234b20e49261c7a002f63b129e985563`

## 1. Live Preview Deployment Manifest (7 November 2026)

| Service | Worker Name | Version ID | Startup Time | Public Preview URL |
|---|---|---|---|---|
| **Central API** | `fryzar-api-preview` | `2760e1e3-7179-4e6f-b8f1-daa60669ea70` | `1 ms` | `https://fryzar-api-preview.perfectlooparts786.workers.dev` |
| **Customer Storefront** | `fryzar-app-preview` | `9466e07b-0820-404c-981f-bc448e1a4e3d` | `1 ms` | `https://fryzar-app-preview.perfectlooparts786.workers.dev` |
| **Admin Control Center** | `fryzar-admin-preview` | `b7a247d2-ad87-4e78-96ae-aefde3a941b4` | `2 ms` | `https://fryzar-admin-preview.perfectlooparts786.workers.dev` |

### Preview Database State
- **Database:** `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`)
- **Pre-migration SQL Backup:** Exported prior to applying `0005`–`0009` (`SHA-256: C41CB58846B9372C9B4F0842CE9C0AB45ACB039DDFE9AEA777B34C1260D289CB`), restored & forward-migrated locally before remote execution.
- **Applied Migrations:** All **9** ordered migrations (`0001_core.sql` through `0009_platform_completion.sql`).

## 2. Live HTTP Smoke Check Evidence (7 November 2026)

All 7 live HTTPS smoke checks returned `200 OK`:
1. `GET https://fryzar-api-preview.perfectlooparts786.workers.dev/api/v1/health` -> `{"ok":true,"service":"fryzar-api","database":"connected","schema":"ready"}`
2. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/api/v1/health` -> `{"ok":true,"service":"fryzar-api","database":"connected","schema":"ready"}` (Service binding verified)
3. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/api/v1/monetization-config` -> `masterEnabled: false`, `publisherStatus: "unverified"` (Safe disabled state verified)
4. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/robots.txt` -> `Disallow: /` (Preview search-indexing block verified)
5. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/sitemap.xml` -> Valid XML `<urlset>` served via customer Worker service binding
6. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/guides` -> `200 text/html` SPA routing verified
7. `GET https://fryzar-admin-preview.perfectlooparts786.workers.dev/` -> `200 text/html` Admin SPA verified

## 3. Preview Deployment Commands

```sh
# 1. Verify preview-only Wrangler target allowlist
npm run test:config-safety

# 2. Apply pending migrations to fryzar-preview ONLY
npm run db:migrate:preview

# 3. Deploy preview Workers ONLY
npm run deploy:api-preview
npm run deploy:customer-preview
npm run deploy:admin-preview
```

## 4. Production Isolation Guarantee

No production Worker (`fryzar-api`, `fryzar-app`, `fryzar-admin`), production D1 database (`fryzar-production`, `fryzar-core`), production secret, or `fryzar.com` DNS/route was modified. Production cutover follows [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md) and [PRODUCTION_ROLLBACK_PLAN.md](PRODUCTION_ROLLBACK_PLAN.md).
