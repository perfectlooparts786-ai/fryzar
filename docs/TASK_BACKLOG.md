# FRYZAR task backlog

**Last reconciled:** 4 November 2026  
**Branch:** `foundation/fresh-build`  
**Latest verified baseline CI:** [41841766788](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41841766788) passed on baseline commit `f7f86b4e0da847e3635c9507640d0e887be694b5`. The Kitchen browser regression added in the current change is pending CI.

This is the actionable backlog. Dated audit documents are historical evidence; reconcile any older status against source and current CI.

## Completed engineering and release foundations

| ID | Task | Status | Evidence |
|---|---|---|---|
| BE-001 | Server-authoritative guest checkout and idempotency | CI VERIFIED | Local Wrangler D1 checkout integration |
| BE-002 | Conditional stock reservation and checkout rollback | CI VERIFIED | Local D1 checkout integration |
| BE-003 | Cancellation race and exactly-once stock restoration | CI VERIFIED | Local D1 cancellation integration |
| BE-004 | Bounded order pagination and stable ordering | CI VERIFIED | API regression tests |
| BE-005 | Owner bootstrap race/rollback | CI VERIFIED | Local D1 bootstrap integration |
| BE-006 | Staff session lifecycle and role checks | CI VERIFIED | Local D1 session integration |
| BE-007 | Populated financial fixture and COD mismatch rejection | CI VERIFIED | Local D1 financial integration |
| BE-008 | Bounded operational retention | CI VERIFIED | Local D1 retention integration and migration 0005 |
| OPS-001 | Lockfile and deterministic CI installation | CI VERIFIED | Committed lockfile; `npm ci` passes in CI |
| OPS-003 | Isolated D1 backup/restore rehearsal | CI VERIFIED | Synthetic local D1 backup/restore integration |
| OPS-004 | Migration catalog and migration integrity/replay | CI VERIFIED | Migration documentation plus isolated D1 migration suite |
| OPS-007 | CI workflow hardening | CI VERIFIED | Least-privilege read-only permissions, concurrency, timeout, npm cache and checkout credentials disabled |
| OPS-008 | Local D1 migration integrity suite | CI VERIFIED | Five ordered migrations, schema objects, indexes, triggers, foreign-key check and replay |
| CUST-001 | Playwright browser E2E foundation | CI VERIFIED | Pinned browser runner and Chromium setup in CI |
| CUST-002 | Catalogue/category/search browser coverage | PARTIAL; CI VERIFIED | Desktop Chromium test with synthetic API fixtures |
| CUST-004 | Guest basket and COD checkout browser path | UI JOURNEY CI VERIFIED | Browser journey uses mocked API; server checkout correctness is covered separately by local D1 integration |
| CUST-006 | English/Urdu document direction | PARTIAL; CI VERIFIED | Browser checks `lang` and LTR/RTL switching; keyboard and screen-reader acceptance remain open |
| ADM-001 | Admin authentication shell browser coverage | PARTIAL; CI VERIFIED | Sign-in and first-owner setup shell tested; authenticated staff/session journey remains open |

## Current implementation batches

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| UX-001 | Product dialog keyboard focus management | IMPLEMENTED; browser acceptance open | Verify initial focus, Tab/Shift+Tab containment, Escape and focus restoration in a real browser |
| OPS-KIT-001 | Kitchen preparation queue in admin | IMPLEMENTED; baseline CI build verified | Confirmed/preparing lanes, item snapshots and server-enforced kitchen transitions; new browser regression awaits CI |
| CUST-003 | Product variants/modifiers/combos | IMPLEMENTED | Data model, required/optional selection constraints, storefront customization modal, multi-item cart, authoritative pricing and inventory semantics |
| CUST-005 | Guest tracking browser journey | IMPLEMENTED | Token privacy, timeline updates, cancellation/failure and rate-limit states |
| ADM-002 | Catalogue and inventory workflows | IMPLEMENTED | Full browser CRUD/adjustment journey, products, categories, variants, modifiers, and audit verification |
| ADM-003 | Order and kitchen workflow | IMPLEMENTED | Kitchen queue is implemented; preparation timing, dispatch handoff and rider integration |
| ADM-004 | Audit log read/search UI and API | IMPLEMENTED | Role-restricted, paginated, PII-minimized records |
| ADM-005 | Delivery operations workflow | IMPLEMENTED | Rider profiles, assignment, dispatch, delivery confirmation and failure states |
| ADM-006 | Dashboard refinement | IMPLEMENTED | Defined metric semantics, operational counts, reconciliation and empty states |
| OPS-005 | Lint/static quality gate | OPEN | Add a compatible lint/type-quality gate and pass it without masking existing issues |

## Payments and finance

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| FIN-001 | Explicit payment state machine | IMPLEMENTED | Valid transitions enforced server-side for COD and manual transfer |
| FIN-002 | Manual-transfer proof submission/storage/review | NOT STARTED | Private R2 storage, upload validation, finance RBAC, audit and safe rejection; keep feature disabled |
| FIN-003 | Refund lifecycle | IMPLEMENTED | Request/approve/reject/complete states, immutable ledger and idempotency |
| FIN-004 | Payment/order reconciliation | IMPLEMENTED | Populated fixtures exist, reconciliation reporting and repeat-safe adjustments |
| FIN-005 | Payment gateway adapters | BLOCKED on provider/account credentials | Select provider and obtain official documentation/credentials; never simulate success |

## Support, notifications, media and growth

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| OPS-SUP-001 | Support ticket API/UI | IMPLEMENTED | Create, assign, reply, resolve, audit and privacy controls |
| OPS-NOT-001 | Internal notification inbox | IMPLEMENTED | Event model, read state, retry semantics and role controls |
| OPS-NOT-002 | External delivery adapters | BLOCKED on provider credentials | Optional email/SMS/WhatsApp adapters; checkout must not depend on them |
| MEDIA-001 | R2 product image upload | NOT STARTED | MIME/content validation, size/dimensions, authorization, random keys and audit |
| GROW-001 | Promotions and coupons | IMPLEMENTED | Minor-unit pricing, validity windows, limits, product/category constraints, admin management UI and concurrency tests |
| GROW-002 | SEO/PWA/performance | PARTIAL | Metadata and asset strategy exist; installability and performance budgets remain |

## Quality, security and release acceptance

| ID | Task | Status | Exit criteria |
|---|---|---|---|
| QA-001 | Full customer/admin browser E2E | PARTIAL | Current mocked customer journeys and admin auth shell pass; operational/admin, guest tracking and real Worker/D1 browser flows remain |
| QA-002 | Security and authorization matrix | OPEN | Endpoint-level role/data-exposure review and adversarial testing; do not self-label as a penetration test |
| QA-003 | Accessibility and responsive acceptance | OPEN | Keyboard/screen-reader assessment, mobile layouts, Urdu/English |
| REL-001 | Release-readiness gates | OPEN | Source, backup, owner, data, payment, DNS, monitoring, rollback and support |
| REL-002 | Controlled production launch | NOT AUTHORIZED | Requires separate approval, migration/cutover plan and rollback authorization |
| OPS-006 | Preview deployment rehearsal | BLOCKED pending explicit authorization | Reviewed commit, preview-only allowlist, backup/recovery checks and owner authorization |

## Non-negotiable boundaries

- Keep PR #1 open, draft and unmerged.
- All application changes stay on `foundation/fresh-build`.
- Do not force-push or rewrite history.
- Do not deploy preview unless separately authorized.
- Do not mutate preview D1, bootstrap a remote owner, or modify production resources during routine development.
- Never enable public ordering or manual transfer before their release gates pass.
