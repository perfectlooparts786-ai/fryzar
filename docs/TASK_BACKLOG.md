# FRYZAR task backlog

Statuses: NOT STARTED, DISCOVERED, IMPLEMENTED, TESTED, VERIFIED INTEGRATION, BLOCKED.

| ID | Task | Status | Exit evidence |
|---|---|---|---|
| F-001 | Fresh-build branch and project scaffold | IMPLEMENTED | 19 files committed on foundation/fresh-build |
| F-002 | Create isolated D1 database | IMPLEMENTED | Cloudflare confirms fryzar-core in APAC |
| F-003 | Add initial schema migration | TESTED | Applied to new D1; read-back confirms 19 app tables, 15 indexes, trigger and seeded settings |
| F-004 | Add API health/catalog/config routes | IMPLEMENTED | TypeScript source committed and Worker bundle uploaded |
| F-005 | Type-check and local API scenarios | TESTED | Strict TypeScript check and six local API scenarios passed |
| F-006 | Deploy isolated fryzar-api Worker | IMPLEMENTED | Deployment metadata, D1 binding and workers.dev enabled; live HTTP behavior remains unverified |
| F-007 | External runtime smoke tests | BLOCKED | Current tool environment cannot resolve workers.dev host; verify through an external browser/device |
| F-008 | Wrangler migration tracking | NOT STARTED | Reconcile already-applied 0001_core.sql before further remote Wrangler migrations |
| B-001 | Catalog admin APIs | NOT STARTED | CRUD, validation, RBAC, audit tests |
| B-002 | Guest checkout and trusted totals | NOT STARTED | Integration tests and atomic persistence |
| B-003 | Mandatory idempotency | NOT STARTED | Replay and concurrency tests |
| B-004 | Inventory reservation/restoration | NOT STARTED | No oversell, negative stock, or duplicate restoration |
| B-005 | Order tracking | NOT STARTED | Random token and hash-based lookup |
| S-001 | Owner bootstrap and staff auth | NOT STARTED | Secure first owner, session and logout tests |
| S-002 | Role authorization | NOT STARTED | Positive and negative role matrix tests |
| S-003 | Abuse, CSRF/origin, and audit controls | NOT STARTED | Security tests |
| W-001 | Customer storefront | NOT STARTED | Responsive bilingual customer journey |
| W-002 | Admin portal | NOT STARTED | Persisted API operations and role-aware UI |
| P-001 | COD collection workflow | NOT STARTED | Due/collected states with audit |
| P-002 | Manual-transfer workflow | NOT STARTED | Private proof, authorized review, replay protection |
| M-001 | Private media storage | BLOCKED | R2 not activated; verify free eligibility, account setup and cost controls first |
| A-001 | Android app | NOT STARTED | Native source, APK build, and E2E evidence |
| D-001 | Production domain routes | NOT STARTED | Hostnames approved; TLS, cookies and CORS tested |
| Q-001 | Cross-platform E2E tests | NOT STARTED | Evidence for critical customer/admin/Android flows |
| R-001 | Production release and rollback | NOT STARTED | All release gates passed |

Do not calculate a completion percentage until the backlog is baselined, weighted acceptance criteria are defined, and tested evidence is available.
