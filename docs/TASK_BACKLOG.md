# FRYZAR task backlog

Statuses: NOT STARTED, DISCOVERED, IMPLEMENTED, TESTED, VERIFIED INTEGRATION, BLOCKED.

| ID | Task | Status | Exit evidence |
|---|---|---|---|
| F-001 | Fresh-build branch and project scaffold | IMPLEMENTED | Files committed; build validation pending |
| F-002 | Create isolated D1 database | IMPLEMENTED | Cloudflare returned fryzar-core database ID |
| F-003 | Add initial schema migration | IMPLEMENTED | SQL file added; apply/read-back pending |
| F-004 | Add API health/catalog/config routes | IMPLEMENTED | Source added; compile/runtime test pending |
| F-005 | Type-check and test API | NOT STARTED | Repeatable tests pass |
| F-006 | Apply migration to fryzar-core | NOT STARTED | Schema, indexes, triggers, seed settings verified |
| F-007 | Deploy isolated fryzar-api Worker | NOT STARTED | workers.dev smoke tests pass |
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
| M-001 | Private media storage | BLOCKED | R2 not activated; verify requirements and costs first |
| A-001 | Android app | NOT STARTED | Native source, APK build, and E2E evidence |
| D-001 | Production domain routes | NOT STARTED | Hostnames approved; TLS, cookies and CORS tested |
| Q-001 | Cross-platform E2E tests | NOT STARTED | Evidence for critical customer/admin/Android flows |
| R-001 | Production release and rollback | NOT STARTED | All release gates passed |

Do not calculate a completion percentage until the baseline backlog and acceptance criteria are finalized.
