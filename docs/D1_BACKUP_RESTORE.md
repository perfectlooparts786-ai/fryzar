# FRYZAR D1 Backup & Restore Verification

**Last updated:** 7 November 2026

## 1. Automated CI Snapshot & Restore Rehearsal (`npm run test:integration:backup-restore`)

Runs on every push/PR in GitHub Actions against an isolated local Wrangler D1 database:
1. Applies all **9 migrations** (`0001_core.sql` – `0009_platform_completion.sql`).
2. Writes a sentinel setting (`backup_restore_probe = "snapshot-ok"`).
3. Snapshots the persisted D1 directory, computes SHA-256 digests for every file, and restores into a separate clean directory.
4. Verifies identical SHA-256 manifests, sentinel row recovery, **9-entry `d1_migrations` ledger**, and `0` foreign-key violations (`PRAGMA foreign_key_check`).

## 2. Verified Remote `fryzar-preview` Export & Restore Rehearsal (7 November 2026)

Prior to applying migrations `0005`–`0009` to remote `fryzar-preview` (`a6f528a3-4b36-43a9-8e77-31f7105a4aeb`):

- **Command executed:**
  ```sh
  npx wrangler d1 export fryzar-preview --remote --output E:/Fryzar/.artifacts/preview-backup/fryzar-preview-pre-0009.sql --config apps/api/wrangler.toml
  ```
- **Verified SHA-256 Checksum:**
  `C41CB58846B9372C9B4F0842CE9C0AB45ACB039DDFE9AEA777B34C1260D289CB`
- **Local Restore & Forward-Migration Drill:**
  - Restored all `69` SQL statements from `fryzar-preview-pre-0009.sql` into an isolated local D1 persistence directory (`restore-rehearsal`).
  - Applied pending migrations `0005` through `0009` on top of the restored dump with `5/5` clean completions before touching remote `fryzar-preview`.
  - Backup artifact is stored outside the Git working tree (`E:/Fryzar/.artifacts/preview-backup/`) so database dumps are never committed to Git.

## 3. Production Backup Rule

Before any authorized production cutover, export fresh SQL backups of both `fryzar-production` (`880b9681-4252-4db0-be44-b60c4edbdc15`) and `fryzar-core` (`098238a6-1bda-4735-8f21-d925c7fe32de`), record SHA-256 checksums, and keep `fryzar-production` untouched as a read-only fallback per [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md).
