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
| A-001 | Staff user CRUD/invites/role management | NOT STARTED | Owner/manager APIs, role matrix, audit |
| A-002 | Product/category CRUD | TESTED | Owner/manager API + admin UI; validation and audit writes; initial stock logged atomically; CI passed. Live Worker test pending |
| A-003 | Inventory adjustment | TESTED | Admin screen + owner/manager API, opening-stock ledger, non-negative guard, idempotency, movement history and audit; 39/39 CI tests; D1 0004 applied/read back. Real D1 concurrency and live Worker verification pending |
| A-004 | Delivery zone management | TESTED | Owner/manager create/update/deactivate, operations/rider read, audit batch, validation and duplicate-code handling; admin UI; 45/45 CI tests. Live Worker verification pending |
| A-005 | Store settings management | TESTED | Public settings read; owner/manager allowlisted update and audit; names, language, COD, WhatsApp, setup/paused. Launch readiness, manual transfer and store opening release-gated. 51/51 CI tests; live Worker verification pending |
| A-006 | Admin dashboard operational metrics | NOT STARTED | Only metrics derived from real D1 rows |
| O-001 | COD collection | NOT STARTED | Authorized collection state and audit |
| P-001 | Manual-transfer state machine | BLOCKED | Keep disabled until private proof storage/review exists |
| P-002 | Private payment-proof storage | BLOCKED | R2 not activated; eligibility/cost review required |
| P-003 | Payment verification/rejection/refund controls | NOT STARTED | Finance RBAC, replay protection, proof access, audit |
| C-001 | Customer tracking page | NOT STARTED | Private token lookup with rate limiting |
| C-002 | Real catalogue, images and delivery configuration | BLOCKED | Genuine business/product data required; do not fabricate |
| C-003 | Support and WhatsApp | BLOCKED | Genuine business contact/policies required |
| M-001 | Android native app | NOT STARTED | Kotlin/Compose source, API integration, APK, device tests |
| D-001 | Domain/custom routes and TLS | NOT STARTED | Confirm final hostname structure; preserve verification records |
| Q-001 | Real D1 batch/concurrency integration tests | NOT STARTED | Rollback, idempotency, oversell, exactly-once cancellation and inventory adjustment `changes()` gating under concurrent writes |
| Q-002 | Customer/admin browser E2E tests | NOT STARTED | Real API and database environment |
| R-001 | Production backup/restore and rollback rehearsal | NOT STARTED | Evidence and documented recovery |
| R-002 | Production release sign-off | NOT STARTED | Every critical release gate passes |

Do not calculate a completion percentage until the backlog is weighted and test evidence is recorded.
