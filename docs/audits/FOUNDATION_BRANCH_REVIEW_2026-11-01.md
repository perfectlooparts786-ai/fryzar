# Foundation branch review — 1 November 2026

## Executive finding

The repository is not uniformly documentation-only. The default branch `main` is documentation-only, but the separate `foundation/fresh-build` branch contains a substantial candidate implementation and an open draft pull request (#1). This branch is development source, not proven exact source for the currently deployed Cloudflare Workers. Do not describe it as recovered production source or merge it solely because its CI is green.

- Branch: `foundation/fresh-build`
- Observed head: `5527ed812e9c6fb6dea85182aad768b50c686fe4`
- Draft PR: [#1 — Fresh FRYZAR platform foundation](https://github.com/perfectlooparts786-ai/fryzar/pull/1)
- PR status: open, draft, base `main`
- Latest successful Actions run on the observed head: [41278429752](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41278429752)
- Code-validation run: [41278344214](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41278344214), on code commit `1c7d8a86cd25cff5b117757296344ef2977c457e`

## Contents found

| Area | Files and notable contents |
| --- | --- |
| API | `apps/api/src/index.ts` (about 97 KB, 2,406 lines), Wrangler config, TypeScript configs, API README |
| Database | Four SQL migrations: `0001_core.sql`, `0002_checkout_integrity.sql`, `0003_admin_bootstrap.sql`, `0004_inventory_adjustments.sql` |
| Customer web app | React/TypeScript storefront, API client, types, styles, Vite config |
| Admin web app | React/TypeScript portal, API client, styles, Vite config |
| Automated tests | `tests/api.test.cjs` (about 69 KB, 1,857 lines) |
| CI | `.github/workflows/ci.yml` |
| Project records | Architecture, deployment, implementation plan, project state, release readiness, reporting standard, security review, task backlog, testing |

The workflow validates API TypeScript, runs the API test suite, and builds both web clients. It does not deploy any Worker or Pages app. No reproducible production deployment workflow was found in this branch.

## CI evidence and limits

- Run 41278344214 completed successfully with 72/72 mocked API tests, strict API TypeScript validation, and successful customer storefront and admin portal builds, as recorded in the branch testing notes.
- The latest observed-head run 41278429752 completed successfully; its job steps for API validation, storefront build, and admin build all succeeded.
- These are CI and mocked-D1 results. They do not prove real D1 transaction rollback, concurrent checkout/oversell safety, authenticated live Worker behavior, browser E2E, domain routing, or production deployment.
- The latest source code was not deployed to the API Worker. Cloudflare still reports API version 3 as the active 100% deployment. The customer/admin Workers are also separate deployed artifacts and have no Git commit provenance in the inventory.

## Android status

`apps/android/README.md` is the only file under `apps/android`. It describes a planned Kotlin/Jetpack Compose client. There is no Gradle project, Kotlin source, APK, or device-test evidence in this branch. The Android app is not implemented.

## Runtime comparison

The current Cloudflare API Worker is bound to `fryzar-core` and is configured with `APP_ENV=development` and localhost-only `ALLOWED_ORIGINS`. Its latest deployed version predates the expanded API/admin source recorded in this branch. The current customer and admin Workers remain bound to `fryzar-production`.

The Cloudflare script download endpoint returned no usable script body through the connected tool. Therefore, exact deployed-source comparison remains blocked. Preserve that distinction: GitHub development source is not evidence of exact source currently serving in production.

## Fresh read-only D1 aggregates

| Database | Products | Categories | Orders | Payments | Staff | Inventory movements | Extra |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `fryzar-production` | 4 | 3 | 0 | 0 | 0 | 0 | 215 tracked stock units; legacy `payment_records` and `order_status_history` tables |
| `fryzar-core` | 0 | 0 | 0 | 0 | 0 | 0 | 4 applied migration records; newer `payments` and `order_status_events` tables |

Core's migration ledger contains `0001_core.sql`, `0002_checkout_integrity.sql`, `0003_admin_bootstrap.sql`, and `0004_inventory_adjustments.sql`. Production has no `d1_migrations` table. Both schemas were read using read-only queries. No customer records or payment contents were queried.

Time-travel bookmarks were read for both D1 databases, but these are not exported backups and do not establish restore capability. No export or restore rehearsal was run. The D1 export operation can affect database availability, so obtain an owner-approved maintenance window before starting export and restore validation.

## Documentation drift found

- `apps/api/README.md` still lists several admin/auth capabilities as “not yet implemented”, while the source and the newer project-state/backlog documents describe admin authentication, staff, catalogue, inventory, zones, settings, tracking, and COD collection.
- Root `README.md`, `docs/PROJECT_STATE.md`, `docs/TASK_BACKLOG.md`, and the API README should be reconciled after source/runtime verification so implemented, CI-tested, deployed, and production-verified states are not conflated.
- The draft PR remains intentionally unmerged. Do not promote the development branch into `main` until the review, runtime integration, and release blockers are resolved.

## Risks and blockers

1. **Exact source recovery blocked:** Cloudflare script download returns no body through the current connector. Do not reconstruct deployed Workers from memory or substitute branch source.
2. **D1 split remains:** app/admin use `fryzar-production`; API uses `fryzar-core`. The production database holds the only observed catalogue and tracked stock. No canonical database decision is justified yet.
3. **No verified backups:** bookmarks exist, but exports and restore tests do not.
4. **API environment is development:** localhost-only origins are not valid production app origins.
5. **No custom domain route:** `fryzar.com` remains without a Worker route; no domain/DNS changes are proposed here.
6. **No real-runtime verification:** CI is green, but mocked D1 tests are not live integration evidence.
7. **No Android implementation:** only a README exists.

## Recommended next actions

1. Obtain a Cloudflare source retrieval path that exposes the original multipart Worker modules and preserve each deployed version with provenance.
2. In parallel, prepare a D1 backup/restore runbook and schedule an approved maintenance window for exports and restore testing.
3. Compare the candidate foundation source against the exact recovered API source; resolve schema and runtime differences before deployment.
4. Refresh the stale API README and project status after evidence review.
5. Keep PR #1 draft and both databases unchanged until the above checks pass.
