# FRYZAR

Bilingual Urdu and English food-ordering platform for Pakistan, built with Cloudflare Workers and D1.

## Current candidate

- Candidate branch: `foundation/fresh-build`, tracked in draft [PR #1](https://github.com/perfectlooparts786-ai/fryzar/pull/1).
- The candidate API, customer storefront and admin portal are deployed to the isolated preview Workers.
- Preview deployment candidate: `84fefded8640cb3abd23cd2df6fdbb811cf9d19d`.
- The preview store remains in setup mode. Checkout is closed, manual transfer is disabled, and no owner account or business catalogue has been created.
- Production Workers and D1 databases remain on their existing, separate legacy bindings. They have not been cut over to the candidate architecture.

## Project records

- [Documentation index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment and recovery](docs/DEPLOYMENT.md)
- [Project state](docs/PROJECT_STATE.md)
- [Release readiness](docs/RELEASE_READINESS.md)
- [Task backlog](docs/TASK_BACKLOG.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Preview operations](docs/operations/PREVIEW_ENVIRONMENT.md)
- [Verified Cloudflare baseline](docs/audits/CLOUDFLARE_BASELINE_2026-11-01.md)
- [D1 schema comparison](docs/audits/D1_SCHEMA_DIFF_2026-11-01.md)
- [Recovered Worker source snapshots](https://github.com/perfectlooparts786-ai/fryzar/pull/3) — archival only, not candidate code

GitHub is the source of truth for code, migrations, tests, workflows and project records. Cloudflare hosts runtime resources. Do not modify production Workers, databases, DNS, routes or secrets as part of preview work.
