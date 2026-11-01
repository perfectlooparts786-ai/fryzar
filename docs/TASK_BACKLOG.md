# FRYZAR task backlog

Statuses: NOT STARTED, DISCOVERED, IMPLEMENTED, TESTED, VERIFIED INTEGRATION, BLOCKED.

| ID | Task | Status | Evidence / exit criteria |
|---|---|---|---|
| F-001 | Fresh-build branch and project scaffold | IMPLEMENTED | Committed on foundation/fresh-build |
| F-002 | Create isolated D1 database | IMPLEMENTED | fryzar-core exists in APAC |
| F-003 | Apply and track core schema migration | TESTED | 0001_core.sql and 0002_checkout_integrity.sql read back in d1_migrations; schema objects verified |
| F-004 | Initial API catalog/config/health routes | IMPLEMENTED | TypeScript source committed; live HTTP verification pending |
| F-005 | Add API test suite and CI workflow | TESTED | GitHub Actions run 41265458517: strict type-check passed and 16/16 API tests passed |
| F-006 | Deploy isolated fryzar-api Worker | IMPLEMENTED | Worker deployment version c0f0ecf8... has 100% traffic; DB and secret bindings verified |
| F-007 | Live API smoke tests | BLOCKED | Current tool environment could not resolve workers.dev; verify through browser/device |
| F-008 | Execute API validation suite in CI | TESTED | GitHub Actions run 41265458517 completed successfully, 16/16 passed |
| B-001 | Product and category administration APIs | NOT STARTED | CRUD, validation, role checks, audit |
| B-002 | Guest checkout with authoritative prices | IMPLEMENTED | Endpoint source added; mocked checkout passes; real D1 integration still pending |
| B-003 | Mandatory idempotency and payload replay | IMPLEMENTED | Key + canonical request hash + 24-hour response cache in source; concurrent D1 test pending |
| B-004 | Atomic stock reservation at checkout | IMPLEMENTED | D1 batch writes and validation trigger added; oversell tests pending |
| B-005 | Secure order tracking | IMPLEMENTED | HMAC-derived token, SHA-256 hash storage, PII-minimized tracking route; runtime tests pending |
| B-006 | Order lifecycle and cancellation stock restoration | NOT STARTED | Role-authorized transitions and exactly-once restock required |
| S-001 | One-time owner bootstrap and staff auth | NOT STARTED | No staff account or login endpoint |
| S-002 | Server-side role authorization | NOT STARTED | No RBAC handlers yet |
| S-003 | Login abuse, CSRF/origin, session and audit controls | NOT STARTED | Checkout/tracking rate limiting is only an initial public API control |
| W-001 | Customer storefront | NOT STARTED | Responsive Urdu/English website, catalog, cart, guest checkout, tracking |
| W-002 | Admin dashboard | NOT STARTED | Staff access, catalog, inventory, orders, delivery, payments, settings |
| P-001 | COD collection workflow | NOT STARTED | COD payment row is created as unpaid; authorized collection transition is missing |
| P-002 | Manual-transfer workflow | BLOCKED | Feature disabled; private proof storage and review not implemented |
| M-001 | Private payment-proof storage | BLOCKED | R2 not activated; verify account eligibility and cost before enablement |
| A-001 | Native Android app | NOT STARTED | Kotlin/Compose source, APK, and device-flow evidence |
| D-001 | Production domain routing | NOT STARTED | Approve hostnames, configure TLS, CORS, cookies, routes |
| Q-001 | Cross-platform end-to-end tests | NOT STARTED | Actual customer/admin/Android tests required |
| R-001 | Production release and rollback | NOT STARTED | All critical release gates must pass |

Do not calculate a completion percentage until the backlog is weighted, acceptance criteria are established, and actual tests are recorded.
