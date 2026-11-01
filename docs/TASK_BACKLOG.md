# FRYZAR task backlog

Statuses: NOT STARTED, DISCOVERED, IMPLEMENTED, TESTED, VERIFIED INTEGRATION, BLOCKED.

| ID | Task | Status | Evidence / exit criteria |
|---|---|---|---|
| F-001 | New GitHub development branch and project scaffold | IMPLEMENTED | Private repo and foundation/fresh-build branch |
| F-002 | Create isolated D1 database | IMPLEMENTED | fryzar-core exists, APAC |
| F-003 | Apply core schema and integrity migrations | TESTED | 0001, 0002 and 0003 recorded; schema objects read back |
| F-004 | API public read routes | IMPLEMENTED | Source + prior mocked test coverage; latest runtime deployment stale |
| F-005 | Guest checkout | IMPLEMENTED | D1-backed authoritative price, mandatory idempotency, atomic batch source; live test pending |
| F-006 | Secure order tracking | IMPLEMENTED | HMAC-derived token, token hash stored, PII omitted in API response test |
| F-007 | Delivery zone API | IMPLEMENTED | Source added and D1 SQL corrected to schema columns; latest live Worker deploy pending |
| F-008 | Customer React storefront | IMPLEMENTED | Source and prior CI production build passed; live integration/deployment pending |
| F-009 | Owner bootstrap/login/session | TESTED | Source and mocked auth tests passed CI; real Worker session and bootstrap runtime test pending |
| F-010 | Admin portal | TESTED | Auth screens, live overview and Orders UI build passed CI; real API/browser integration pending |
| F-011 | Role-aware order list/detail | IMPLEMENTED | Role checks in source; finance/rider/support excluded; D1 integration tests pending |
| F-012 | Order status transition and cancellation restock | IMPLEMENTED | Conditional D1 batch with stock restoration, movement, history and audit; concurrency test pending |
| F-013 | Validate catalogue, inventory, delivery and settings source with CI | TESTED | GitHub Actions run 41270993539 on `ab5557a` passed strict TypeScript, 51/51 API tests, storefront build and admin build |
| F-014 | Deploy current API source to isolated Worker | NOT STARTED | Worker source must exactly match validated GitHub commit |
| F-015 | Live API health/catalog/zone/admin smoke tests | BLOCKED | Tool environment could not externally fetch workers.dev; verify through browser/device |
| A-001 | Staff access lifecycle and role management | TESTED | Owner/manager create/list/update, reset-password, PBKDF2 hashing, session revocation and audit; 62/62 CI tests. Email invitations and live Worker integration remain pending |
| A-002 | Product/category CRUD | TESTED | Owner/manager API + admin UI; validation and audit writes; initial stock logged atomically; CI passed. Live Worker test pending |
| A-003 | Inventory adjustment | TESTED | Admin screen + owner/manager API, opening-stock ledger, non-negative guard, idempotency, movement history and audit; 39/39 CI tests; D1 0004 applied/read back. Real D1 concurrency and live Worker verification pending |
| A-004 | Delivery zone management | TESTED | Owner/manager create/update/deactivate, operations/rider read, audit batch, validation and duplicate-code handling; admin UI; 45/45 CI tests. Live Worker verification pending |
| A-005 | Store settings management | TESTED | Public settings read; owner/manager allowlisted update and audit; names, language, COD, WhatsApp, setup/paused. Launch readiness, manual transfer and store opening release-gated. 51/51 CI tests; live Worker verification pending |
| A-006 | Admin dashboard operational metrics | TESTED | Authenticated aggregate API, typed admin API client, Overview state/data loading and dashboard cards; role and PII-exclusion tests; GitHub Actions run 41278344214 passed 72/72 API tests, strict TypeScript and both web builds. Live Worker/D1 integration pending |
| O-001 | COD collection | TESTED | Owner/manager/finance can mark only delivered unpaid COD as collected; order/payment updates, collector ID, timestamp, audit and idempotency are atomic; 70/70 CI tests. Live Worker integration pending |
| P-001 | Manual-transfer state machine | BLOCKED | Keep disabled until private proof storage/review exists |
| P-002 | Private payment-proof storage | BLOCKED | R2 not activated; eligibility/cost review required |
| P-003 | Payment verification/rejection/refund controls | NOT STARTED | Finance RBAC, replay protection, proof access, audit |
| C-001 | Customer order tracking page | TESTED | Bilingual tracking input and order lifecycle/amounts UI, mobile/desktop navigation and confirmation shortcut; 62/62 CI tests. Live Worker tracking check pending |
| C-002 | Real catalogue, images and delivery configuration | BLOCKED | Genuine business/product data required; do not fabricate |
| C-003 | Support and WhatsApp | BLOCKED | Genuine business contact/policies required |
| M-001 | Android native app | NOT STARTED | Kotlin/Compose source, API integration, APK, device tests |
| D-001 | Domain/custom routes and TLS | NOT STARTED | Confirm final hostname structure; preserve verification records |
| Q-001 | Real D1 batch/concurrency integration tests | NOT STARTED | Rollback, idempotency, oversell, exactly-once cancellation and inventory adjustment `changes()` gating under concurrent writes |
| Q-002 | Customer/admin browser E2E tests | NOT STARTED | Real API and database environment |
| R-001 | Production backup/restore and rollback rehearsal | NOT STARTED | Evidence and documented recovery |
| R-002 | Production release sign-off | NOT STARTED | Every critical release gate passes |

Do not calculate a completion percentage until the backlog is weighted and test evidence is recorded.


## Development update — dashboard metrics and CI stabilization (2026-11-01)

- Corrected malformed escaped newlines in API route dispatch and admin portal source.
- Completed dashboard metrics frontend integration: typed API method, top-level state, overview prop and authenticated data loading.
- A-006 is now TESTED based on GitHub Actions run 41278344214 (commit 1c7d8a86cd25cff5b117757296344ef2977c457e): 72/72 API tests, API strict TypeScript validation, storefront build and admin build passed.
- Deployment and real-service integration tasks remain open; do not treat CI success as deployment evidence.


## External infrastructure/release blockers — audit 2026-11-01

These are tracked as repository issues because they cross the legacy deployed runtime, the candidate application, and Cloudflare infrastructure. They are not considered complete by the candidate branch's mocked CI.

| Issue | Task | Current evidence / exit criteria |
|---|---|---|
| [#4](https://github.com/perfectlooparts786-ai/fryzar/issues/4) | Checkout/payment/stock integrity transition | Fix legacy payment-row omission, server-required idempotency, atomic stock reservation, delivery-fee config consistency; prove with real D1 rollback/concurrency tests |
| [#5](https://github.com/perfectlooparts786-ai/fryzar/issues/5) | Admin authorization and cancellation safety | Fix legacy role-scoped order reads, login throttling and exact-once stock restoration; verify all roles against isolated D1 |
| [#6](https://github.com/perfectlooparts786-ai/fryzar/issues/6) | Legacy-to-central API migration | Prove customer/admin clients use central API in preview; remove duplicate business rules only after controlled cutover plan |
| [#7](https://github.com/perfectlooparts786-ai/fryzar/issues/7) | D1 source-of-truth and restore | Verify SQL backup artifacts, perform D1-native isolated restores, reconcile schemas/data/relationships, test migration and rollback |
| [#8](https://github.com/perfectlooparts786-ai/fryzar/issues/8) | CORS, production config and domain | Replace wildcard CORS, set reviewed production origins/mode, verify cookies/TLS/Worker routes; owner approval required for production/DNS changes |

**Current project gate:** both stores remain in setup/not-ready state. Production manual transfer is disabled. Do not switch D1 bindings, open the store, enable manual transfer, or route the public domain until issues #4–#8 have their required evidence and approvals.
