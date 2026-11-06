# FRYZAR testing and verification

**Last reconciled:** 4 November 2026  
**Branch:** `foundation/fresh-build`  
**Latest verified baseline CI:** [41841766788](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41841766788), successful on `f7f86b4e0da847e3635c9507640d0e887be694b5`. The Kitchen browser regression in the current change awaits a new CI result.

## CI pipeline

The workflow uses Node 22 and `npm ci --ignore-scripts --no-audit --no-fund` with the committed lockfile. It runs:

1. API TypeScript check, API unit tests and Worker routing tests.
2. Pinned Playwright runner and Chromium installation.
3. Browser tests for the customer setup state, English/Urdu document direction, mocked catalogue/search/cart/guest-COD ordering, and admin sign-in/first-owner setup shell.
4. Isolated local Wrangler D1 checkout, cancellation, owner-bootstrap, session, financial-integrity, retention and migration-integrity suites.
5. Isolated local D1 backup/restore rehearsal.
6. Preview-only Worker/D1 configuration safety tests.
7. Customer and admin production builds.
8. API, customer and admin Wrangler preview dry-runs.

The baseline run passed every listed step. Dry-runs do not deploy Workers or apply remote migrations.

## Browser test scope and limitations

- Browser tests use synthetic fixtures and mocked `/api/v1/*` responses. They verify UI behavior, not live API availability or remote customer data.
- The guest-ordering browser path covers product discovery, category filtering, search, basket and COD checkout request/confirmation. The real Worker/D1 checkout transaction is tested separately by local D1 integration.
- Storefront language coverage verifies document `lang` and `dir` switching for English LTR and Urdu RTL. It does not replace keyboard, contrast or screen-reader review.
- Admin baseline browser coverage verifies unauthenticated sign-in and first-owner setup screens. It does not yet cover full staff lifecycle and all admin modules.
- A Kitchen browser regression has been added to exercise a synthetic kitchen session, privacy-limited order data and `confirmed → preparing → ready`. Its CI result is pending.
- Playwright currently runs Desktop Chromium. Mobile viewports, other browsers, real devices and assistive technology are not yet accepted.

## Local D1 integration coverage

The isolated local D1 suites cover:

- Checkout idempotency, concurrency, conditional stock reservations and atomic rollback.
- Cancellation race handling, exactly-once stock restoration and atomic rollback.
- First-owner bootstrap concurrency, validation and rollback.
- Staff sessions, expiry/logout/deactivation/password reset/role changes and access boundaries.
- Populated financial fixtures, COD amount consistency, collection replay and rollback.
- Bounded retention expiry while excluding active sessions and financial/audit history.
- Migration order, schema objects, indexes, triggers, foreign-key integrity and idempotent replay.
- Backup/restore against synthetic isolated database state.

These tests do not write to remote preview or production D1.

## Verification matrix

| Area | Status | Limitation |
|---|---|---|
| API typecheck/unit tests | PASS in baseline CI | Many route tests use mocked D1 |
| Worker routing tests | PASS in baseline CI | Not a browser test |
| Local D1 checkout/cancellation/bootstrap/session/finance/retention | PASS in baseline CI | Synthetic isolated local database |
| Migration integrity and replay | PASS in baseline CI | Local migration validation, not remote schema inspection |
| Backup/restore rehearsal | PASS in baseline CI | Isolated local fixtures, not a live customer-data recovery |
| Customer/admin production builds | PASS in baseline CI | Build success does not prove full usability |
| Browser E2E baseline | PASS in baseline CI | Mocked API, desktop Chromium, scoped journeys |
| Kitchen browser regression | PENDING | Added in current development change |
| Preview Worker dry-runs/config safety | PASS in baseline CI | Does not deploy or remotely mutate |
| Lint/static quality gate | NOT CONFIGURED | No lint gate in CI |
| Screen-reader/mobile acceptance | NOT PERFORMED | Requires separate browser/device review |
| Current branch deployed to preview | NOT VERIFIED | Deployment workflow remains pinned to historical candidate |
| Remote D1 concurrency/rollback | NOT PERFORMED for current branch | Do not infer from local D1 |
| Production test/deployment | NOT PERFORMED | Explicitly out of scope |

## Existing test scripts

- `npm test`
- `npm run test:e2e`
- `npm run test:integration:local`
- `npm run test:integration:cancellation`
- `npm run test:integration:bootstrap`
- `npm run test:integration:session`
- `npm run test:integration:financial`
- `npm run test:integration:retention`
- `npm run test:integration:migrations`
- `npm run test:integration:backup-restore`
- `npm run test:config-safety`
- `npm run build:storefront`
- `npm run build:admin`

## Security and data handling

- Test credentials and tokens are synthetic and generated for test runs.
- Never persist secrets in fixtures, screenshots, logs or artifacts.
- Never use real customer data in automated checkout tests.
- Preserve 24-hour idempotency replay behavior.
- Never delete financial, order, inventory or audit history as part of cleanup tests.
- Manual transfer remains disabled until private proof storage and finance review are implemented and verified.
- A passing CI suite is not a penetration test or production-readiness approval.

## Reproducing locally

From a clean checkout with Node 22:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:e2e
npm run test:integration:local
npm run test:integration:cancellation
npm run test:integration:bootstrap
npm run test:integration:session
npm run test:integration:financial
npm run test:integration:retention
npm run test:integration:migrations
npm run test:integration:backup-restore
npm run test:config-safety
npm run build:storefront
npm run build:admin
```

Use isolated local D1 state for integration scripts. Never use remote D1 commands for synthetic fixtures.
