# FRYZAR Production Rollback & Emergency Recovery Plan

**Last updated:** 7 November 2026  
**Target RTO (Worker Rollback):** < 5 minutes  
**Target RPO (Pre-Order Cutover):** 0 rows lost (`fryzar-production` preserved untouched)

## 1. Architectural Rollback Advantage

Because the production cutover migrates `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`) while keeping `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) **100% untouched** and preserving exact recovered Worker bundles in branch `recovery/cloudflare-worker-source-2026-11-01` (PR #3):

- `fryzar-app` legacy baseline version: `91fdf9ab-ae00-4928-b5be-a1a356cc0f19`
- `fryzar-admin` legacy baseline version: `80b357d6-e6ea-49a7-a6bb-0802f7b88084`
- `fryzar-api` baseline version: `c0f0ecf8-97ef-4768-a947-f3f56be0df8e`

Any cutover anomaly prior to opening live customer orders can be reversed immediately without destructive SQL.

## 2. Immediate Containment Switches (No Redeploy Required)

| Incident Type | Immediate Action (< 30 seconds) |
|---|---|
| Misbehaving third-party ad script or creative | Click **Emergency Disable All Ads** in **Admin -> 22. Advertising & Monetization** (`POST /api/v1/admin/advertising/kill-switch`). |
| Kitchen overload, rider shortage, or pricing typo | Set `store_status` to `"paused"` in **Admin -> 25. Store Settings** (`PATCH /api/v1/admin/settings`) — immediately closes `POST /api/v1/orders` (`HTTP 503`) while keeping order tracking live. |
| Compromised or departed staff member | Deactivate staff user or reset password in **Admin -> 24. Staff & Roles** — atomically revokes all active sessions in D1. |

## 3. Full Cutover Rollback Procedure

If a critical regression occurs during production cutover verification:

1. **Pause Ordering Immediately:** Ensure `store_status = "setup"` or `"paused"` so no new orders enter `fryzar-core`.
2. **Detach Custom Domains (if attached):** Remove Worker Custom Domain bindings for `fryzar.com` / `admin.fryzar.com` in Cloudflare Dashboard -> Workers & Pages -> Custom Domains.
3. **Roll Back Worker Versions:**
   ```sh
   npx wrangler rollback --name fryzar-app --version-id 91fdf9ab-ae00-4928-b5be-a1a356cc0f19
   npx wrangler rollback --name fryzar-admin --version-id 80b357d6-e6ea-49a7-a6bb-0802f7b88084
   npx wrangler rollback --name fryzar-api --version-id c0f0ecf8-97ef-4768-a947-f3f56be0df8e
   ```
4. **D1 Point-in-Time Recovery (Post-Launch Only):**
   - Never run `DROP TABLE` or destructive `DELETE` statements against production D1.
   - If post-launch data corruption occurs, export current state first for forensic preservation, then inspect Cloudflare D1 Time Travel bookmarks (`wrangler d1 time-travel info fryzar-core --timestamp <ISO-8601>`) per `docs/D1_RECOVERY_RUNBOOK.md` after explicit Owner approval.

## 4. Preview Environment Pre-Migration Backup Record (7 November 2026)

Before applying migrations `0005`–`0009` to `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`):
- **Exported SQL Artifact (local untracked):** `E:/Fryzar/.artifacts/preview-backup/fryzar-preview-pre-0009.sql`
- **SHA-256 Digest:** `C41CB58846B9372C9B4F0842CE9C0AB45ACB039DDFE9AEA777B34C1260D289CB`
- **Local Restore & Forward-Migration Rehearsal:** Verified (`69` SQL commands restored cleanly into isolated local D1, followed by `0005`–`0009` clean execution).
