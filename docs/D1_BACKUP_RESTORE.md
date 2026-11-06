# FRYZAR local D1 backup and restore rehearsal

**Scope:** disposable local Wrangler D1 only. This is not a remote Cloudflare D1 backup, managed point-in-time recovery, or production restore procedure.

## What the automated rehearsal proves

The CI test creates a fresh local D1 database through the same Wrangler version and migration configuration used by the integration suite. It then:

1. Inserts a synthetic, non-public sentinel setting.
2. Copies the completed local Wrangler persistence directory into a separate backup directory after each Wrangler command has exited.
3. Copies that backup into a second, separate local persistence directory.
4. Compares sorted SHA-256 hashes for every persisted file in the backup and restored directories.
5. Opens the restored database through Wrangler using the restored persistence directory.
6. Verifies the sentinel row, the five-entry migration ledger, and zero foreign-key violations.
7. Removes all temporary directories during test cleanup.

The test uses only `--local` Wrangler operations. The helper rejects `--remote` and refuses commands that omit `--local`; Cloudflare account credentials are blanked in the child process environment.

## Important limitations

- A directory-level local persistence snapshot is suitable for a disposable local test rehearsal. It does not prove that a remote D1 database can be exported, imported, or restored.
- The test is not a substitute for Cloudflare's managed backup/PITR controls, remote export procedure, retention policy, or an independently verified recovery-point objective.
- It does not copy production data or any remote preview data.
- No remote database writes, migrations, exports, restores, or owner bootstrap operations are performed.
- Before launch, separately document and rehearse the supported remote D1 recovery path, access controls, retention, backup ownership, recovery time objective, recovery point objective, and post-restore validation. That work requires explicit approval for any remote operation.

## Run locally

```sh
npm ci
npm run test:integration:backup-restore
```

The CI workflow runs the same test on every applicable branch/PR validation.
