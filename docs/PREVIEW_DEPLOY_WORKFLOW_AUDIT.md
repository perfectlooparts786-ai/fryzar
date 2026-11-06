# Manual preview deployment workflow audit

Audit date: 3 November 2026  
Audited workflow: .github/workflows/deploy-preview.yml  
Audited development branch HEAD before this audit: 47a3276f631cb6f3935008b28116008d54a88c02  
Pinned deployment candidate: 84fefded8640cb3abd23cd2df6fdbb811cf9d19d

## Scope and conclusion

This is a source/configuration audit only. The workflow was NOT dispatched. No remote migration, secret update, Worker deployment, owner bootstrap, preview D1 write, or production operation was performed.

The workflow is deliberately manual (workflow_dispatch), uses GitHub's preview environment, has repository permission contents: read, serializes deployments with a non-cancelling concurrency group, checks out a fixed reviewed SHA, validates account and preview resource identifiers, migrates only the configured preview D1, provisions two preview Worker secrets, deploys the three preview Workers, and runs HTTP smoke tests.

The source pin is old relative to the current development branch. It must remain unchanged until a new candidate has passed CI, code review, migration review, and a separately approved preview deployment plan.

## Workflow sequence and side effects

| Order | Step | Effect / gate |
|---|---|---|
| 1 | workflow_dispatch | Manual trigger only. No automatic push/PR deployment. |
| 2 | permissions: contents: read | Workflow does not request repository write permission. |
| 3 | environment: preview | Uses GitHub environment secrets and any environment protection rules configured in repository settings. The actual reviewer/branch protection configuration is not visible in this workflow source and must be verified in GitHub settings before dispatch. |
| 4 | concurrency fryzar-preview-deploy, cancel-in-progress: false | Prevents overlapping preview deployments and does not cancel an in-progress deployment. |
| 5 | checkout pinned SHA 84fefde... into candidate/ | Prevents the workflow from deploying arbitrary current branch HEAD. |
| 6 | validate account and secrets | Requires the expected Cloudflare account ID, non-empty API/tracking/bootstrap secrets, and minimum 32-character tracking/bootstrap secrets. Secret values are not printed. |
| 7 | install and run checks/builds | Installs pinned candidate dependencies, verifies Cloudflare auth with wrangler whoami, runs tests/local D1 integration and frontend builds. |
| 8 | preview-only target assertions | Checks API/customer/admin Worker names, D1 name/UUID and service bindings; rejects known production Worker/database names and IDs. |
| 9 | apply remote preview migrations | REMOTE MUTATION: npm run db:migrate:preview executes wrangler d1 migrations apply fryzar-preview --remote using the pinned candidate's API Wrangler config. This is the first remote state-changing step. |
| 10 | bootstrap API Worker deployment | Deploys fryzar-api-preview. |
| 11 | provision Worker secrets | Writes TRACKING_SECRET and OWNER_BOOTSTRAP_TOKEN to the preview API Worker via Wrangler secret commands. This changes preview Worker configuration. |
| 12 | final API deploy | Redeploys the API Worker after secret updates. |
| 13 | customer/admin deploy | Deploys fryzar-app-preview and fryzar-admin-preview, each bound to the preview API service. |
| 14 | HTTP smoke tests | Checks API/D1 health, service forwarding, exact CORS, catalogue/categories, setup flags, closed checkout, unauthenticated admin session and React app shells. |

## Verified target configuration

At the pinned SHA, apps/api/wrangler.toml identifies:
- Worker: fryzar-api-preview
- Environment: APP_ENV = "preview"
- D1: fryzar-preview
- D1 ID: a6f528a3-4b36-43a9-8e77-31f7105a4aeb
- Migration directory: migrations

Customer and admin configs identify their respective preview Worker names and service-bind to fryzar-api-preview. The same target names/IDs remain in the current development branch. The pinned candidate's package scripts include db:migrate:preview, deploy:api-preview, deploy:customer-preview, and deploy:admin-preview. Its deployment install uses npm install; that candidate predates the current branch lockfile, so do not change it to npm ci without changing and verifying the candidate itself.

## What the smoke test does not prove

- It does not create an owner account or call the owner bootstrap endpoint.
- It does not verify authenticated owner/admin workflows.
- It does not seed real categories, products, images, prices, delivery zones, or business content.
- It does not place a successful order; it deliberately asserts checkout remains closed.
- It does not test payment collection, manual transfer proof, refunds, notifications, support, R2 uploads, or customer-facing end-to-end browser journeys.
- It does not prove backup recovery or rollback after a remote migration.
- It does not validate production domains, production resources, or production readiness.

## Required pre-dispatch checklist

Before any future preview deployment, an authorized operator must:

1. Confirm the exact candidate SHA is reviewed, CI-green, and intentionally selected.
2. Confirm PR #1 remains draft/unmerged unless the user explicitly authorizes otherwise.
3. Inspect the complete migration diff against the actual preview schema and verify backward compatibility.
4. Confirm a recoverable preview D1 backup/recovery point and a documented rollback approach. The local snapshot rehearsal is not a remote D1 backup.
5. Verify GitHub preview environment protection, required reviewers, allowed deployment branches, and secret scope in repository settings.
6. Verify the Cloudflare API token is least-privilege and scoped to the intended account/resources.
7. Reconfirm the workflow's fixed Worker names, D1 name/UUID, service bindings, and production-target rejection checks.
8. Obtain explicit user authorization to dispatch this preview deployment. The dispatch applies remote D1 migrations and changes preview Worker code/secrets.
9. After deployment, inspect the run, smoke-test evidence, migration ledger, and preview-only resource state. Do not bootstrap the owner unless separately authorized.

## Risks and follow-up

- Remote D1 migration precedes Worker deployment. A failed later deploy may leave the preview database migrated while Workers remain on an earlier version. Migration compatibility and recovery must be reviewed before dispatch.
- GitHub environment protection is referenced by name but cannot be proven from YAML. Verify settings in GitHub before using the environment.
- The workflow uses a fixed SHA by design. Advancing it is a release decision, not routine CI maintenance.
- The workflow intentionally installs the pinned candidate using npm install; current development branch CI separately uses its committed lockfile and npm ci.
- Preview deployment remains a gated, user-authorized operation. Production remains strictly out of scope.
