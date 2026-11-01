# Fryzar decisions

## 2026-11-01 — Keep database choice open

**Status:** Pending complete reconciliation and owner sign-off before any cutover.

**Context:** fryzar-app and fryzar-admin use fryzar-production; fryzar-api uses fryzar-core. Read-only counts show 4 products, 3 categories, and 215 tracked stock units in fryzar-production; those catalogue tables are empty in fryzar-core. Schemas differ across payments, order status events, inventory, store settings, sessions, and other structures. Core has four migration records; production has no migration ledger. Both databases have exported SQL backups that replayed successfully in local SQLite. A Cloudflare D1 managed-restore drill is not yet complete.

**Decision:** No canonical D1 is selected. Keep both databases intact and do not change bindings or migrate rows until full schema/data/index/relationship reconciliation, a D1-specific rollback test, and owner sign-off.

**Alternatives considered:** Select fryzar-core based on its newer schema; retain fryzar-production based on current catalogue/stock. Neither is justified without complete reconciliation and D1-specific rollback evidence.

**Approval:** No production cutover is proposed or approved.

## 2026-11-01 — Do not substitute candidate development code for deployed source

**Status:** Exact-source recovery remains blocked on source retrieval capability.

**Context:** Cloudflare lists three active Fryzar Workers, but the connected script-download call returned no body. The GitHub repository has a candidate implementation on `foundation/fresh-build` with draft PR #1; its exact match to deployed Workers is not established.

**Decision:** Do not claim source recovery or deploy candidate source as a replacement. Preserve the original modules and deployment provenance when a connector path provides exact script payloads.

**Approval:** Not applicable.
