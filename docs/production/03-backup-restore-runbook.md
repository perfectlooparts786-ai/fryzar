# FRYZAR — D1 Backup & Restore Verification Runbook

**Document ID:** `03-BACKUP-RESTORE-RUNBOOK`  
**Status:** Rehearsed & Verified in Automated Local D1 Drill (`tests/backup-restore.integration.cjs`)  
**Cloudflare Account ID:** `234b20e49261c7a002f63b129e985563`

---

## 1. Purpose & Non-Negotiable Rules

No production migration, schema change, catalogue import, or Worker cutover may begin until **both** production D1 databases (`fryzar-production` and `fryzar-core`) have:
1. A fresh SQL export saved outside the Git working tree (`$HOME/fryzar-backups/<timestamp>/`).
2. A recorded SHA-256 cryptographic digest (`manifest.sha256.json`).
3. A verified local restore drill proving `PRAGMA integrity_check = ok`, `PRAGMA foreign_key_check = []`, and exact row-count parity.

Never commit SQL database exports into Git (`*.sql` backup dumps may contain staff email hashes, order records, or operational data).

---

## 2. Target Databases

| Database Name | Database ID | Role |
| --- | --- | --- |
| `fryzar-production` | `880b9681-4252-4db0-be44-b60c4edbdc15` | Legacy 15-table production database (preserve untouched as read-only archive) |
| `fryzar-core` | `098238a6-1bda-4735-8f21-d925c7fe32de` | Canonical production D1 database for `fryzar-api` |
| `fryzar-preview` | `a6f528a3-4b36-43a9-8e77-31f7105a4aeb` | Isolated preview D1 database |

---

## 3. Pre-Cutover Backup Procedure (PowerShell)

Run from `E:/Fryzar/fryzar` with authenticated Wrangler credentials:

```powershell
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$BackupDir = Join-Path $HOME "fryzar-backups\$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# 1. Export legacy fryzar-production
npx.cmd wrangler d1 export fryzar-production --remote --output "$BackupDir\fryzar-production.sql"

# 2. Export target fryzar-core
npx.cmd wrangler d1 export fryzar-core --remote --config apps/api/wrangler.production.toml --output "$BackupDir\fryzar-core.sql"

# 3. Export structured JSON snapshot of legacy catalogue rows
npx.cmd wrangler d1 execute fryzar-production --remote --json --command "SELECT * FROM categories ORDER BY sort_order;" > "$BackupDir\legacy-categories.json"
npx.cmd wrangler d1 execute fryzar-production --remote --json --command "SELECT * FROM products ORDER BY name_en;" > "$BackupDir\legacy-products.json"

# 4. Generate SHA-256 manifest
Get-ChildItem -File $BackupDir | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  [PSCustomObject]@{
    file = $_.Name
    bytes = $_.Length
    sha256 = $hash
    created_utc = $Stamp
  }
} | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 "$BackupDir\manifest.sha256.json"

Get-Content "$BackupDir\manifest.sha256.json"
```

Record the folder name (`$Stamp`) and `fryzar-core.sql` SHA-256 digest — this value is **mandatory** for the `verified_backup_reference` input in `.github/workflows/deploy-production.yml`.

---

## 4. Mandatory Local Restore Verification Drill

Before authorizing cutover, verify that `fryzar-core.sql` restores cleanly into an isolated local D1 directory without touching any remote database:

```powershell
$VerifyDir = Join-Path $env:TEMP "fryzar-restore-verify-$Stamp"
New-Item -ItemType Directory -Force -Path $VerifyDir | Out-Null

# Restore exported SQL into isolated local SQLite/D1 instance
npx.cmd wrangler d1 execute fryzar-core --local --persist-to $VerifyDir --config apps/api/wrangler.production.toml --file "$BackupDir\fryzar-core.sql"

# Validate SQLite integrity and foreign keys
npx.cmd wrangler d1 execute fryzar-core --local --persist-to $VerifyDir --config apps/api/wrangler.production.toml --command "PRAGMA integrity_check; PRAGMA foreign_key_check;"

# Compare restored row counts against remote baseline
npx.cmd wrangler d1 execute fryzar-core --local --persist-to $VerifyDir --config apps/api/wrangler.production.toml --command "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table') AS tables, (SELECT COUNT(*) FROM store_settings) AS settings, (SELECT COUNT(*) FROM orders) AS orders;"

# Clean up temporary verification directory
Remove-Item -Recurse -Force $VerifyDir
```

**Pass Criteria:**
- `integrity_check` returns `ok`.
- `foreign_key_check` returns zero rows.
- `tables`, `settings`, and `orders` match the pre-export remote query counts identically.

---

## 5. Emergency Remote Restore Procedure (`fryzar-core`)

> **CAUTION:** Cloudflare D1 is backed by SQLite + automatic Time Travel bookmarks (`wrangler d1 time-travel`). Prefer **Cloudflare D1 Time Travel** first for point-in-time recovery, and SQL dump import second if full table reconstruction is required.

### Option A — Cloudflare D1 Time Travel Restore (Fastest, Atomic)
1. Inspect bookmark before migration timestamp:
   ```powershell
   npx.cmd wrangler d1 time-travel info fryzar-core --timestamp "<ISO-8601-PRE-CUTOVER-UTC>" --config apps/api/wrangler.production.toml
   ```
2. Restore to exact bookmark:
   ```powershell
   npx.cmd wrangler d1 time-travel restore fryzar-core --bookmark "<BOOKMARK_ID>" --config apps/api/wrangler.production.toml
   ```

### Option B — Full SQL Export Re-Import
If restoring from `$BackupDir\fryzar-core.sql`:
1. Verify checksum against `manifest.sha256.json`:
   ```powershell
   (Get-FileHash "$BackupDir\fryzar-core.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
   ```
2. Execute validated SQL backup file:
   ```powershell
   npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --file "$BackupDir\fryzar-core.sql"
   ```
3. Run post-restore health check:
   ```powershell
   npx.cmd wrangler d1 execute fryzar-core --remote --config apps/api/wrangler.production.toml --command "PRAGMA integrity_check; PRAGMA foreign_key_check;"
   ```

---

## 6. Automated Rehearsal Status

- **`npm run test:integration:backup-restore`** (`tests/backup-restore.integration.cjs`): Continuously runs in CI on every push/PR — populates an isolated local D1 database with categories, products, staff, orders, payments, inventory movements, and settings, snapshots the database state, simulates destructive state corruption, restores from the snapshot, and verifies byte-level data, ledger, and foreign-key integrity.
