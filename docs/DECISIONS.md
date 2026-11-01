# Fryzar decisions

## 2026-11-01 — Keep database choice open

**Status:** Pending complete reconciliation and owner sign-off before any cutover.

**Context:** fryzar-app and fryzar-admin use fryzar-production; fryzar-api uses fryzar-core. Read-only counts show 4 products, 3 categories, and 215 tracked stock units in fryzar-production; those catalogue tables are empty in fryzar-core. Schemas differ across payments, order status events, inventory, store settings, sessions, and other structures. Core has four migration records; production has no migration ledger. Both databases have exported SQL backups that replayed successfully in local SQLite. A Cloudflare D1 managed-restore drill is not yet complete.

**Decision:** No canonical D1 is selected. Keep both databases intact and do not change bindings or migrate rows until full schema/data/index/relationship reconciliation, a D1-specific rollback test, and owner sign-off.

**Alternatives considered:** Select fryzar-core based on its newer schema; retain fryzar-production based on current catalogue/stock. Neither is justified without complete reconciliation and D1-specific rollback evidence.

**Approval:** No production cutover is proposed or approved.

## 2026-11-01 — Preserve exact deployed Worker source separately from development source

**Status:** Source recovery recorded in draft PR #3; review pending.

**Context:** The Cloudflare download endpoint returned the exact deployed module bodies for `fryzar-app`, `fryzar-admin`, and `fryzar-api`. The modules were preserved in `recovery/cloudflare-worker-source-2026-11-01` with deployment/version IDs and SHA-256 digests. Git tree read-back confirms the full blob sizes. The separate `foundation/fresh-build` branch contains a newer candidate implementation, but its architecture and routes differ from the deployed Workers.

**Decision:** Keep the recovered snapshots immutable and separate from the candidate source. Do not deploy or overwrite live Workers from either branch until source review, schema/data reconciliation, D1-specific rollback testing, preview verification, and owner approval are complete.

**Approval:** No production deployment, binding change, or migration is approved by this record.
