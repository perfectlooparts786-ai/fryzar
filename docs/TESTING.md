# FRYZAR testing and verification

**Last reconciled:** 3 November 2026  
**Current branch:** `foundation/fresh-build`  
**Latest Phase 3 implementation commit:** `d420cae9f260fc1aa2e7abc741bce96c71eaa44a` (final CI pending)  
**Latest final-head CI:** [41569582732](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41569582732) (success)  
**Audit-head CI:** [41568524358](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41568524358) (success)

## Automated CI coverage

The workflow uses Node 22 and `npm ci --ignore-scripts --no-audit --no-fund`. Root `package-lock.json` is lockfileVersion 3 and committed. The lockfile-backed install passed in CI; Windows-specific installation has not been independently tested.

The CI workflow runs:

- API typecheck and API unit tests via `npm test`.
- Worker routing tests.
- Local Wrangler D1 checkout integration.
- Local Wrangler D1 cancellation integration.
- Local Wrangler D1 owner bootstrap integration.
- Local Wrangler D1 session lifecycle integration.
- Local Wrangler D1 populated financial integrity integration.
- Local Wrangler D1 bounded retention integration.
- Local Wrangler D1 migration integrity/replay integration.
- Customer storefront production build.
- Admin portal production build.
- API, customer and admin Wrangler preview dry-runs.

Latest final-head CI completed successfully. See the workflow run for exact step results. CI dry-runs do not deploy Workers or apply remote migrations.

## Existing test scripts

- `npm test`
- `npm run test:integration:local`
- `npm run test:integration:cancellation`
- `npm run test:integration:bootstrap`
- `npm run test:integration:session`
- `npm run test:integration:financial`
- `npm run test:integration:retention`
- `npm run test:integration:migrations`
- `npm run build:storefront`
- `npm run build:admin`

## Verification boundaries

| Area | Status | Limitation |
|---|---|---|
| API typecheck/unit tests | PASS in current final-head CI | Mocked D1 for many route tests |
| Worker routing tests | PASS | Not a browser UI test |
| Six existing local D1 suites | PASS in earlier final-head CI | Synthetic fixtures in isolated local Wrangler D1 |
| Migration integrity suite | IMPLEMENTED, UNVERIFIED | New suite awaits final-head CI; asserts 5 ordered migrations, 21 tables, 21 indexes, 2 triggers, zero FK violations and no-op replay |
| Storefront/admin builds | PASS | Build success does not prove browser usability |
| Wrangler preview dry-runs | PASS | No deployment, remote mutation or live smoke test |
| Lockfile install | PASS in CI | No independent Windows install test |
| Lint | NOT CONFIGURED | No lint gate in CI |
| Browser E2E | NOT IMPLEMENTED | Critical customer/admin workflows need browser automation |
| Screen-reader testing | NOT PERFORMED | Requires actual browser/assistive technology review |
| Remote preview D1 concurrency/rollback | NOT PERFORMED for current branch | Do not infer from local D1 |
| Current HEAD deployed to preview | NOT VERIFIED | Manual deployment workflow remains pinned to historical candidate |
| Production test/deployment | NOT PERFORMED | Production explicitly out of scope |

## Browser E2E acceptance plan

Use Playwright or another maintained browser framework only after verifying compatibility with the current Node/Vite/Worker stack.

The first browser suite should use an isolated local/test Worker + local D1 with synthetic fixtures. Do not point automated checkout tests at live preview or production.

Customer acceptance journey:
1. Load storefront and public configuration.
2. Browse categories and search.
3. Open a product detail view.
4. Add/update/remove cart items.
5. Select delivery zone.
6. Submit invalid checkout and verify field/error feedback.
7. Submit valid guest COD order against synthetic test data.
8. Verify confirmation and private tracking token handling.
9. Track order and verify status/PII projection.
10. Verify setup/closed-store and API-offline states.

Admin acceptance journey:
1. Bootstrap/login only against isolated synthetic test data.
2. Verify session state and logout.
3. Verify role-specific navigation and direct API access denial.
4. Create/update catalogue items.
5. Adjust stock and verify ledger.
6. Process order status transitions and cancellation.
7. Record COD collection after permitted delivery state.
8. Verify deactivated staff/session revocation.
9. Verify finance and kitchen data projections.

## Security and data handling

- Test credentials and tokens must be synthetic and generated for test runs.
- Never persist secrets in fixtures, screenshots, logs or artifacts.
- Never use real customer data.
- Preserve 24-hour idempotency replay behaviour.
- Never delete financial, order, inventory or audit history as part of cleanup tests.
- Keep manual transfer disabled until proof storage/review is implemented and verified.
- No test is a penetration test or production-readiness approval unless a separately scoped professional assessment is performed.

## Reproducing locally

From a clean checkout with Node 22:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:integration:local
npm run test:integration:cancellation
npm run test:integration:bootstrap
npm run test:integration:session
npm run test:integration:financial
npm run test:integration:retention
npm run test:integration:migrations
npm run build:storefront
npm run build:admin
```

Use only isolated local D1 state for integration scripts. Do not use remote D1 commands for test fixtures.
