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
| F-009 | Owner bootstrap/login/session | IMPLEMENTED | Atomic first-owner claim, PBKDF2, hashed session token, secure cookie source; CI/runtime verification pending |
| F-010 | Admin portal | IMPLEMENTED | Auth screens, live overview and Orders UI source; current admin build CI pending |
| F-011 | Role-aware order list/detail | IMPLEMENTED | Role checks in source; finance/rider/support excluded; D1 integration tests pending |
| F-012 | Order status transition and cancellation restock | IMPLEMENTED | Conditional D1 batch with stock restoration, movement, history and audit; concurrency test pending |
| F-013 | Run latest CI on complete API/customer/admin source | NOT STARTED | Must pass strict API TS, API tests, customer build and admin build |
| F-014 | Deploy current API source to isolated Worker | NOT STARTED | Worker source must exactly match validated GitHub commit |
| F-015 | Live API health/catalog/zone/admin smoke tests | BLOCKED | Tool environment could not externally fetch workers.dev; verify through browser/device |
| A-001 | Staff user CRUD/invites/role management | NOT STARTED | Owner/manager APIs, role matrix, audit |
| A-002 | Product/category CRUD | NOT STARTED | Server validation, slugs, prices, image references, audit |
| A-003 | Inventory adjustment | NOT STARTED | Reasoned movement records and non-negative stock |
| A-004 | Delivery zone management | NOT STARTED | Owner/manager CRUD and public allowlisted read |
| A-005 | Store settings management | NOT STARTED | Validate origin, payments, delivery, languages, launch state |
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
| Q-001 | Real D1 batch/concurrency integration tests | NOT STARTED | Rollback, idempotency, oversell and exactly-once cancellation |
| Q-002 | Customer/admin browser E2E tests | NOT STARTED | Real API and database environment |
| R-001 | Production backup/restore and rollback rehearsal | NOT STARTED | Evidence and documented recovery |
| R-002 | Production release sign-off | NOT STARTED | Every critical release gate passes |

Do not calculate a completion percentage until the backlog is weighted and test evidence is recorded.
