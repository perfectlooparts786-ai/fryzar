# FRYZAR task backlog

## Current Phase 1B status (2 November 2026)

| ID | Task | Status | Evidence / exit criteria |
|---|---|---|---|
| B-001 | Refresh GitHub refs and PR state | DONE | main `bac292b`; candidate reconciled by merge commit `c82152d`; PR #1 draft/unmerged; PR #3 archival/draft |
| B-002 | Review incoming main commits | DONE | 13 commits were documentation/audit imports and preview workflow history; no Worker bindings, migrations, API, or frontend source changed |
| B-003 | Reconcile main into development | DONE | Non-force two-parent merge; candidate code preserved; incoming documentation/audits imported; README retained and linked; ignore rules unioned; CI passed |
| B-004 | Add npm lockfile | BLOCKED | No lockfile exists. Local npm registry access was unavailable; automated review rejected a temporary CI job with persistent `contents: write` and auto-push behavior. Use an approved controlled generation path; do not bypass that review. |
| B-005 | Switch installs to `npm ci` | OPEN | Only after lockfile generation and `npm ci` verification; current workflows continue to use npm install |
| B-006 | Candidate regression baseline | DONE (without lockfile) | CI 41468365672 passed npm install, 82 API tests, 6 routing tests, local D1 checkout integration, both builds and all three Wrangler dry-runs |
| B-007 | Preview safety | VERIFIED | Workflow pinned to reviewed `84fefde`; preview-only database and service bindings; no redeployment needed |
| B-008 | Update project status docs and PR #1 | IN PROGRESS | Complete after docs commits and final CI; keep PR draft and do not merge |

## Product/release work that remains outside this stabilization

- Remote D1 concurrency/rollback, backup/restore rehearsal, and migration recovery.
- Authenticated browser E2E for customer and admin flows; role and PII integration checks.
- Owner bootstrap rehearsal and secure first-owner account creation (not yet run).
- Genuine catalog, delivery-zone, pricing, support and policy data from the owner.
- Private manual-transfer proof storage and finance review; keep transfer disabled until complete.
- Review the archived legacy wildcard-CORS finding before any production transition.
- Production schema reconciliation/cutover remains a separately reviewed future phase; do not modify production in this work.
- Android client is not in the current stabilization scope.

No product feature work is authorized by this backlog update.
