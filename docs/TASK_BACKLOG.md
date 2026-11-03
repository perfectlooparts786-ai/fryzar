# FRYZAR task backlog

**Last reconciled:** 3 November 2026  
**Branch:** `foundation/fresh-build`  
**Latest Phase 3 implementation commit:** `d420cae9f260fc1aa2e7abc741bce96c71eaa44a` (CI pending)

This is the actionable backlog. Older dated status narratives have been consolidated; consult `PHASE3_AUDIT_2026-11-03.md` for the source-backed audit details.

## Completed

| ID | Task | Status | Evidence |
|---|---|---|---|
| BE-001 | Server-authoritative guest checkout and idempotency | COMPLETE | Local Wrangler D1 checkout integration and CI |
| BE-002 | Conditional stock reservation and checkout rollback | COMPLETE | Local D1 integration fixtures |
| BE-003 | Cancellation race and exactly-once stock restoration | COMPLETE | Local D1 cancellation integration |
| BE-004 | Pagination bounds and stable ordering | COMPLETE | API regression tests |
| BE-005 | Owner bootstrap race/rollback | COMPLETE | Local D1 bootstrap integration |
| BE-006 | Staff session lifecycle and role checks | COMPLETE | Local D1 session integration |
| BE-007 | Populated financial fixture and COD mismatch rejection | COMPLETE | Local D1 financial integration |
| BE-008 | Bounded operational retention | COMPLETE | Local D1 retention integration and migration 0005 |
| OPS-001 | Lockfile and deterministic CI installation | COMPLETE | Committed root lockfile; final-head CI uses npm ci |
| UX-001 | Product dialog keyboard focus management | IMPLEMENTED; browser verification pending | Focus management code on branch; no browser E2E evidence |

## Phase 3: release engineering

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| OPS-002 | Audit/manual deployment workflow dependency install | COMPLETE (NO CHANGE REQUIRED) | Pinned historical candidate `84fefde` has no package-lock.json; retain npm install there until a separately reviewed candidate is selected |
| OPS-003 | D1 backup/restore rehearsal | OPEN | Repeatable isolated restore test and verified hashes; no live destructive operations |
| OPS-004 | Migration documentation 0001–0005 | IMPLEMENTED, UNVERIFIED | `docs/MIGRATIONS.md` added; final-head CI migration suite pending |
| OPS-005 | Lint/static quality gate | OPEN | Select compatible tools, add scripts and CI, pass without masking existing issues |
| OPS-006 | Preview deployment rehearsal | BLOCKED pending explicit authorization | Reviewed commit, preview-only allowlist, backup/recovery checks, owner authorization |
| OPS-007 | CI workflow hardening | IMPLEMENTED, UNVERIFIED | Concurrency, timeout, npm cache and checkout credential persistence disabled; final-head CI pending |
| OPS-008 | Local D1 migration integrity test | IMPLEMENTED, UNVERIFIED | New isolated suite checks five migrations, 21 tables, 21 indexes, two triggers, FK integrity and replay; final-head CI pending |

## Phase 4: customer journey

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| CUST-001 | Browser E2E foundation | OPEN | Playwright or equivalent, reproducible CI browser setup, isolated fixtures |
| CUST-002 | Catalogue/search/category browser journey | OPEN | Desktop/mobile viewport checks and empty/error states |
| CUST-003 | Product options/variants | NOT STARTED | Agreed model, API validation, server pricing and inventory semantics |
| CUST-004 | Cart and guest checkout browser journey | OPEN | Successful/invalid/closed-store states, server totals, idempotency |
| CUST-005 | Guest tracking browser journey | OPEN | Token privacy, status timeline, failure and rate-limit states |
| CUST-006 | Urdu RTL / English LTR accessibility | OPEN | Browser keyboard, focus, labels, contrast and manual assistive-tech review |

## Phase 5: admin operations

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| ADM-001 | Admin browser E2E foundation | OPEN | Login, session, role-based route tests |
| ADM-002 | Catalogue and inventory workflows | PARTIAL | CRUD/adjustment journey with audit verification |
| ADM-003 | Order and kitchen workflow | PARTIAL | All permitted transitions and cancellation states |
| ADM-004 | Audit log read/search UI and API | NOT STARTED | Role-restricted, paginated, PII-minimized records |
| ADM-005 | Delivery operations workflow | PARTIAL | Assignment/handoff/confirmation design and tests |
| ADM-006 | Dashboard refinement | PARTIAL | Metrics definitions, date windows and consistent empty states |

## Phase 6: payments and finance

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| FIN-001 | Explicit payment state machine | OPEN | Documented valid transitions and API enforcement |
| FIN-002 | Manual transfer proof submission/storage/review | NOT STARTED | Private R2/object storage, upload validation, finance RBAC, audit; remain disabled until verified |
| FIN-003 | Refund lifecycle | NOT STARTED | Request/approve/reject/complete states, immutable ledger, idempotency |
| FIN-004 | Payment/order reconciliation | PARTIAL | Populated fixture plus exception reporting and repeat-safe reconciliation |
| FIN-005 | Gateway adapter | BLOCKED on provider/account credentials | Real provider selected and authorized; never simulate payment success |

## Phase 7: support and notifications

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| OPS-SUP-001 | Support ticket API/UI | NOT STARTED | Create, assign, reply, resolve, audit and privacy controls |
| OPS-NOT-001 | Internal notification inbox | NOT STARTED | Event model, read state, retry semantics and role controls |
| OPS-NOT-002 | External delivery adapters | NOT STARTED | Optional provider adapters; checkout must not depend on them |

## Phase 8: media and growth

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| MEDIA-001 | R2 product image upload | NOT STARTED | MIME/content, size, dimensions, authorization, random keys and audit |
| GROW-001 | Promotions/discount rules | NOT STARTED | Integer minor-unit pricing, validity windows, limits and tests |
| GROW-002 | SEO/PWA/performance | PARTIAL | Metadata, asset strategy, installability and performance checks |

## Phase 9–10: acceptance and release

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| QA-001 | Full customer/admin browser E2E | OPEN | Critical journeys in isolated test environment |
| QA-002 | Security and authorization matrix | OPEN | Endpoint-level role and data-exposure review; not self-labelled penetration test |
| QA-003 | Accessibility review | OPEN | Keyboard and screen-reader assessment, Urdu/English |
| REL-001 | Release-readiness gates | OPEN | Source, CI, backups, owner, data, payment, DNS, monitoring, rollback, support |
| REL-002 | Controlled production launch | NOT AUTHORIZED | Requires separately approved migration/cutover and rollback plan |

## Non-negotiable boundaries

- Keep PR #1 open and draft.
- All application changes stay on `foundation/fresh-build`.
- Do not force-push or rewrite history.
- Do not deploy preview unless separately authorized.
- Do not mutate preview D1, bootstrap a remote owner, or modify production resources as part of routine development.
- Never enable public ordering or manual transfer before their release gates pass.
