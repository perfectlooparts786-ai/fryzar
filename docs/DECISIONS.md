# Fryzar decisions

## 2026-11-01 — Keep database choice open

**Status:** Pending owner approval after evidence.

**Context:** fryzar-app and fryzar-admin use fryzar-production; fryzar-api uses fryzar-core. The refreshed read-only count shows 4 products and 3 categories in fryzar-production, while those tables are empty in fryzar-core. Schemas differ in payments, status events, inventory, store settings, sessions, and other structures. Core has four migration records; production has no migration ledger.

**Decision:** No canonical D1 is selected in this audit. Keep both databases intact and do not change bindings or migrate rows until both have verified backups and restore evidence, and a complete reconciliation plan is reviewed.

**Alternatives considered:** Select fryzar-core based on its newer schema; retain fryzar-production based on current catalogue data. Neither is justified without full row, relationship, schema, and restore analysis.

**Approval:** Not requested for a production cutover; no cutover is proposed here.

## 2026-11-01 — Do not reconstruct deployed Worker source

**Status:** Recovery blocked on source retrieval capability.

**Context:** Cloudflare lists three active Fryzar Workers, but the connected script download call returned no body. GitHub currently contains documentation only.

**Decision:** Do not commit inferred/reconstructed source or claim source recovery. Preserve original Worker modules and deployment provenance when a connector path provides the exact script payload.

**Approval:** Not applicable.
