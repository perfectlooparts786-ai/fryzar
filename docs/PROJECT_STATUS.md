# Fryzar project status

Updated: 1 November 2026

## Repository state

- Default branch `main` is documentation-only at observed head `de248fd43d36ab25437cfee9418d06d7f268a73e`; its root contains `README.md` and `FRYZAR_Documentation_Pack_v2.0.zip`.
- Development branch `foundation/fresh-build` contains candidate API, customer React storefront, admin React portal, four D1 migrations, a 72-test mocked API suite, project documents, and a GitHub Actions CI workflow.
- Draft PR [#1](https://github.com/perfectlooparts786-ai/fryzar/pull/1) is open from `foundation/fresh-build` to `main`. Do not merge until source review and runtime/database checks pass.
- Audit PR [#2](https://github.com/perfectlooparts786-ai/fryzar/pull/2) records infrastructure, backup, branch, and runtime comparison findings.
- Recovery draft PR [#3](https://github.com/perfectlooparts786-ai/fryzar/pull/3) preserves exact deployed source for all three Workers on `recovery/cloudflare-worker-source-2026-11-01`.
- Foundation head observed: `5527ed812e9c6fb6dea85182aad768b50c686fe4`. CI run [41278429752](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41278429752) succeeded. Code commit `1c7d8a86cd25cff5b117757296344ef2977c457e` passed [run 41278344214](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41278344214): 72/72 mocked API tests, strict API TypeScript validation, and both web builds.

## Completed in this audit

- Refreshed exact-name GitHub and Cloudflare inventories, including all relevant branches and open PRs.
- Retrieved the deployed module bodies for `fryzar-app`, `fryzar-admin`, and `fryzar-api`; preserved them with deployment/version IDs, binding inventory, SHA-256 digests, and a targeted static scan in recovery PR #3.
- Git tree read-back confirms complete source blob sizes: customer 37,817 bytes, admin 33,957 bytes, API 22,511 bytes. The initial text-file uploads were found truncated and replaced using Git blob objects before opening PR #3.
- Compared deployed source behavior with `foundation/fresh-build`. The live customer/admin Workers contain direct D1-backed handlers; the candidate development branch uses a centralized API and React clients. The deployed API lacks the delivery-zone and expanded admin endpoints present in candidate source.
- Read both D1 schemas, the core migration ledger, and non-sensitive aggregate counts.
- Reviewed the committed D1 backup manifest: it records SQL exports, sizes/hashes, local SQLite replay and post-export live probes. Raw dumps are outside GitHub and this execution workspace; D1-managed restore is still outstanding.
- Recorded findings in [CLOUDFLARE_BASELINE_2026-11-01.md](audits/CLOUDFLARE_BASELINE_2026-11-01.md), [FOUNDATION_BRANCH_REVIEW_2026-11-01.md](audits/FOUNDATION_BRANCH_REVIEW_2026-11-01.md), [DEPLOYED_VS_FOUNDATION_2026-11-01.md](audits/DEPLOYED_VS_FOUNDATION_2026-11-01.md), and [LEGACY_RUNTIME_FINDINGS_2026-11-01.md](audits/LEGACY_RUNTIME_FINDINGS_2026-11-01.md).
- Confirmed current launch guards: both databases are in setup/not-ready state; production manual transfer is disabled. The current store is not configured to accept checkout.
- No Worker, DNS, D1 schema/data/binding, route, or secret was changed. No secret values or customer records were queried or committed.

## GitHub work items

- [#4 Checkout, payment and stock integrity](https://github.com/perfectlooparts786-ai/fryzar/issues/4)
- [#5 Admin permissions, login throttling and cancellation](https://github.com/perfectlooparts786-ai/fryzar/issues/5)
- [#6 Central API architecture transition](https://github.com/perfectlooparts786-ai/fryzar/issues/6)
- [#7 D1 reconciliation and restore verification](https://github.com/perfectlooparts786-ai/fryzar/issues/7)
- [#8 CORS, production environment and domain routing](https://github.com/perfectlooparts786-ai/fryzar/issues/8)

## Remaining, in priority order

1. Independently review the recovered snapshots and compare them against the candidate source at function and data-model level; resolve the direct-D1 legacy architecture versus central-API architecture transition.
2. Verify access to the raw D1 backup artifacts and hashes, restore both into isolated non-production D1 databases, and record D1-specific restore evidence. The current manifest records local SQLite replay, not a Cloudflare D1 managed-restore drill.
3. Complete schema/data/index/foreign-key/migration reconciliation and prepare a rollback-tested canonical D1 proposal. Preserve the production catalogue and 215 tracked stock units.
4. Fix the legacy path's payment-record omission, atomic stock reservation, cancellation stock restoration, optional server-side idempotency, unthrottled admin login, and unscoped order reads. Detailed source evidence is in [LEGACY_RUNTIME_FINDINGS_2026-11-01.md](audits/LEGACY_RUNTIME_FINDINGS_2026-11-01.md).
5. Add real D1 integration tests for idempotency, concurrent checkout/oversell, inventory adjustment, cancellation restoration, and rollback.
6. Review wildcard CORS in the deployed customer Worker; define approved customer/admin/API origins and test actual browser CORS/cookie behavior before any deployment.
7. Verify live HTTP, admin sessions/RBAC, browser E2E, and controlled preview deployment. External workers.dev checks remain unverified from the current tool network.
8. Reconcile documentation drift, especially the stale `apps/api/README.md`, then reassess Android and launch requirements.

## System status

- **GitHub:** `main` remains documentation-only. Candidate implementation is in `foundation/fresh-build` with draft PR #1 and green mocked CI. Exact deployed Worker snapshots are in recovery PR #3. Audit records are in PR #2. No production deployment workflow was found in the candidate branch.
- **Worker alignment:** `fryzar-app` and `fryzar-admin` use `fryzar-production`; `fryzar-api` uses `fryzar-core`. Deployed sources are now preserved in GitHub and tied to Cloudflare deployment/version identifiers. API remains `APP_ENV=development` with localhost-only origins.
- **D1:** `fryzar-production` has 4 products, 3 categories, 215 tracked stock units, and zero orders, payment records, staff, or inventory movements. `fryzar-core` has zero products, categories, orders, payments, staff, and inventory movements, plus four applied migrations. Schemas differ materially. SQL exports and local SQLite replay are recorded in the manifest; a D1 managed-restore test is not yet proven. No canonical D1 is selected.
- **Customer/admin/API:** deployed customer and admin Workers have direct legacy D1-backed handlers. The deployed API currently contains health, catalogue, checkout, and tracking routes. The candidate branch adds central API and expanded admin functionality, but its live D1/Worker/browser integration is unverified. Production and core databases both indicate setup/not-ready; manual transfer is disabled in both.
- **Android:** only a planning README exists; no native source project or APK.
- **Domain/routing:** `fryzar.com` is active, has one apex TXT record, and no Worker routes or Worker custom domains were returned.
- **Security/testing:** `fryzar-app` source contains wildcard CORS. Candidate code passes mocked CI, but there is no production security sign-off, D1 concurrency/rollback proof, or live end-to-end verification.

## Risks and blockers

- The split D1 bindings and differing schemas can cause application components to use different data models.
- The only observed catalogue and tracked stock are in `fryzar-production`; do not reset, overwrite, migrate, or rebind either database without complete reconciliation, tested rollback, and owner approval.
- Local SQLite replay is not equivalent to a D1 managed-restore rehearsal.
- API development environment and localhost origins prevent production readiness.
- Customer Worker wildcard CORS needs review.
- Legacy checkout/admin defects listed in the runtime findings report must be remediated or conclusively superseded by the candidate architecture before launch.
- No `fryzar.com` route exists, and no live external smoke test has completed.
- Green mocked CI does not establish production functionality.

## Next action

Perform isolated D1 restore and full schema/data reconciliation using the two backup artifacts; keep both live databases and all deployed Workers unchanged while preparing the evidence-based migration proposal.
