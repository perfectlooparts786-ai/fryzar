# FRYZAR

Bilingual Urdu and English food-ordering platform for Pakistan, built with Cloudflare Workers and D1.

## Current Accepted Release Candidate (7 November 2026)

- **Accepted Release Candidate Branch:** `feature/fryzar-preview-acceptance` (reconciled atop `feature/fryzar-master-transformation` and `foundation/fresh-build`; draft [PR #1](https://github.com/perfectlooparts786-ai/fryzar/pull/1) remains open and unmerged pending Owner cutover approval).
- **Release Gate Verdict:** **RELEASE CANDIDATE READY / PREVIEW ACCEPTANCE PASSED** ($0.00/month Cloudflare Workers Free + D1 Free).
- **Live Isolated Preview Workers:**
  - Customer Storefront: `https://fryzar-app-preview.perfectlooparts786.workers.dev` (`16bc6c30-96ed-42b7-bdfa-26dac85b1791`)
  - Admin Control Center: `https://fryzar-admin-preview.perfectlooparts786.workers.dev` (`40f93681-a678-4867-a920-92717dd3b560`)
  - Central API: `https://fryzar-api-preview.perfectlooparts786.workers.dev` (`b811d6af-78ba-4374-93d5-26eba94d7095`)
- **Preview Safety State:** The preview store remains in safe setup mode (`store_status = "setup"`, `launch_ready = false`), manual transfer is disabled (`manual_transfer_enabled = false`), Adsterra monetization is disabled (`masterEnabled = false`), and `first_owner` bootstrap remains unclaimed for the Owner.
- **Production Isolation:** Production Workers (`fryzar-api`, `fryzar-app`, `fryzar-admin`), D1 databases (`fryzar-production` with 3 categories, 4 products, and 215 stock units; `fryzar-core`), secrets, and `fryzar.com` DNS remain **100% untouched**.

## Project Records

- [Documentation index (24 core docs)](docs/README.md)
- [Phase 2 Preview Acceptance Report](docs/PREVIEW_ACCEPTANCE_REPORT.md)
- [27-Module Admin & RBAC Verification](docs/ADMIN_MODULE_VERIFICATION.md)
- [Customer Storefront Journey QA](docs/CUSTOMER_JOURNEY_QA.md)
- [Owner Business Inputs Checklist](docs/OWNER_BUSINESS_INPUTS.md)
- [Performance & Free-Tier Baseline](docs/PERFORMANCE_BASELINE.md)
- [Production Cutover Readiness](docs/PRODUCTION_CUTOVER_READINESS.md)
- [Remaining Blockers](docs/REMAINING_BLOCKERS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment and recovery](docs/DEPLOYMENT.md)
- [Security review](docs/SECURITY_REVIEW.md)

GitHub is the source of truth for code, migrations, tests, workflows and project records. Cloudflare hosts runtime resources. Do not modify production Workers, databases, DNS, routes or secrets as part of preview work.
