# FRYZAR Preview Deployment & Operational Verification

**Last deployed & verified:** 7 November 2026 (Phase 2 Preview Acceptance)  
**Branch:** `feature/fryzar-preview-acceptance`  
**Cloudflare Account:** `234b20e49261c7a002f63b129e985563`

## 1. Live Preview Deployment Manifest (7 November 2026)

| Service | Worker Name | Accepted Phase 2 Version ID | Startup Time | Public Preview URL |
|---|---|---|---|---|
| **Central API** | `fryzar-api-preview` | `b811d6af-78ba-4374-93d5-26eba94d7095` | `2 ms` | `https://fryzar-api-preview.perfectlooparts786.workers.dev` |
| **Customer Storefront** | `fryzar-app-preview` | `16bc6c30-96ed-42b7-bdfa-26dac85b1791` | `1 ms` | `https://fryzar-app-preview.perfectlooparts786.workers.dev` |
| **Admin Control Center** | `fryzar-admin-preview` | `40f93681-a678-4867-a920-92717dd3b560` | `1 ms` | `https://fryzar-admin-preview.perfectlooparts786.workers.dev` |

### Preview Database State
- **Database:** `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`)
- **Pre-migration SQL Backup:** Exported prior to applying `0005`–`0009` (`SHA-256: C41CB58846B9372C9B4F0842CE9C0AB45ACB039DDFE9AEA777B34C1260D289CB`), restored & forward-migrated locally before remote execution.
- **Applied Migrations:** All **9** ordered migrations (`0001_core.sql` through `0009_platform_completion.sql`).

## 2. Live HTTP & Edge Security Smoke Check Evidence (7 November 2026)

All live HTTPS and edge security-header checks passed:
1. `GET https://fryzar-api-preview.perfectlooparts786.workers.dev/api/v1/health` -> `200 OK` (`{"ok":true,"service":"fryzar-api","database":"connected","schema":"ready"}`)
2. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/api/v1/health` -> `200 OK` (Service binding verified)
3. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/api/v1/monetization-config` -> `200 OK` (`masterEnabled: false`, `effectiveActive: false`, full `devices`/`pages`/`formats`/`safety` contract)
4. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/robots.txt` -> `200 OK` (`Disallow: /` in preview)
5. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/sitemap.xml` -> `200 OK` (Valid XML `<urlset>`)
6. `GET https://fryzar-app-preview.perfectlooparts786.workers.dev/` -> `200 OK` with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
7. `GET https://fryzar-admin-preview.perfectlooparts786.workers.dev/` -> `200 OK` with `X-Robots-Tag: noindex, nofollow, noarchive` + full security headers; `/api/v1/admin/session` -> `401` unauthenticated guard; `Origin: https://evil.example` -> `403 origin_not_allowed`

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
