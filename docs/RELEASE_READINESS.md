# FRYZAR release readiness

**Current verdict: NOT READY**

This document covers the candidate source on `foundation/fresh-build`. It does not certify the currently deployed legacy Workers. Exact deployed source is archived separately in recovery PR #3. The candidate source has passed CI, but real D1/Worker/browser integration and production release gates remain open.

## Verified candidate build evidence

- [x] API strict TypeScript validation passes on the latest observed candidate branch head.
- [x] API mocked test suite passes in GitHub Actions; run 41278344214 recorded 72/72 tests.
- [x] Customer React storefront production build passes.
- [x] Admin React portal production build passes.
- [x] Latest observed-head workflow run 41278429752 completed successfully.

These checkboxes mean candidate source/build checks only. They do not mean the application is deployed, live-integrated, or production-ready.

## Blocking release gates

### Runtime and architecture
- [ ] Exact deployed Worker snapshots reviewed against candidate source; legacy-to-central API migration plan approved.
- [ ] Candidate Worker source deployed to an isolated preview/development Worker from an exact reviewed Git commit.
- [ ] Preview Worker configuration uses the intended D1 binding and approved secret names without exposing secret values.
- [ ] Live HTTP health, catalogue, delivery-zone, checkout-disabled, admin login/session, staff, order, inventory and COD endpoints pass.
- [ ] Customer and admin React apps are served from approved origins and use the central API; no parallel business logic remains.
- [ ] No production Worker binding/configuration change occurs without owner approval.

### Data integrity and recovery
- [ ] Raw backup artifacts and SHA-256 hashes are independently verified.
- [ ] Both SQL dumps are restored into isolated Cloudflare D1 databases and compared to export evidence.
- [ ] Canonical D1 is selected only after full schema/data/index/foreign-key/migration reconciliation and owner sign-off.
- [ ] Forward migration and rollback are tested against isolated D1 copies.
- [ ] Real D1 tests prove rollback, required idempotency, concurrent checkout cannot oversell, cancellation restores stock once, inventory adjustments are atomic, and payment/order writes reconcile.
- [ ] Cutover plan includes one-Worker-at-a-time routing, smoke tests and a restore/rollback path.
- [ ] Production data and the existing catalogue are preserved until post-cutover validation succeeds.

### Application and business readiness
- [ ] Owner bootstrap token is configured securely on the preview Worker; bootstrap, login, session expiry, logout, revocation and password reset are tested.
- [ ] Staff role permissions and customer PII projections are verified against every protected endpoint.
- [ ] Product/category/inventory/delivery administration is live-tested against the approved D1.
- [ ] Genuine products, PKR prices, product images and delivery zones are provided and verified by the owner.
- [ ] Customer Urdu RTL and English LTR flows pass browser E2E on mobile and desktop.
- [ ] Admin dashboard, orders, payments, settings, inventory and staff operations pass browser E2E.
- [ ] COD collection flow is live-tested with reconciliation and audit evidence.
- [ ] Manual transfer remains disabled until private proof storage, access controls, reviewer permissions, rejection/refund, replay protection and end-to-end tests exist.
- [ ] Genuine customer support number, delivery, cancellation, privacy, terms and refund policies are configured.
- [ ] Store remains closed until owner approves genuine business configuration and every required gate passes.

### Security, domain and release operations
- [ ] Customer CORS wildcard removed; API uses exact approved customer/admin origins.
- [ ] Production mode and rate-limit fail-closed behavior are verified.
- [ ] Login throttling, tracking rate limits, session/cookie behavior, CSRF and role enforcement pass integration tests.
- [ ] No critical data-integrity, security or privacy issue remains.
- [ ] Final hostname structure is approved; DNS, Worker routes, TLS, redirects, cookies and CORS pass external smoke tests.
- [ ] GitHub workflow deploys only the exact reviewed commit; production deploy requires owner approval.
- [ ] Backup, D1 restore, Worker rollback and incident recovery rehearsal are recorded.
- [ ] Release notes, deployment/version IDs, commit SHA, test evidence and known limitations are recorded.

### Android (future scope)
- [ ] Kotlin/Compose project exists, uses the stable API contract, and has an installable APK and device test evidence. Android is not required for the initial web release unless the owner re-approves its scope.

## Current live baseline and launch guard

The current deployed customer/admin/API Workers are separate legacy artifacts and use split D1 bindings: customer/admin use `fryzar-production`; API uses `fryzar-core`. The customer/admin Workers have local D1-backed handlers while the API exposes a separate central API. The production API is still configured with `APP_ENV=development` and localhost-only origins. The customer Worker has wildcard CORS.

Read-only checks on 1 November 2026:
- `fryzar-production`: 4 products, 3 categories, 215 tracked stock units, 0 orders, 0 payment records, 0 staff.
- `fryzar-core`: 0 products, 0 categories, 0 orders, 0 payments, 0 staff; four migrations applied.
- Production and core store settings indicate setup/not-ready; manual transfer is disabled in both.
- `fryzar.com` has no Fryzar Worker routes/custom domains recorded in the current inventory.
- No Android source project or APK is present.

The deployed legacy code has additional release blockers documented in audit PR #2: stock oversell risk, missing checkout payment record, optional idempotency at the server boundary, cancellation without stock restoration, admin order-read scope gaps, no legacy login throttling, and client-side hard-coded delivery display fee. Do not open the store on the legacy path.

## Release rule

Do not set `launch_ready=true`, change `store_status` to `open`, enable manual transfer, route the public domain, or deploy to production merely to make a dashboard appear complete. Every gate requires evidence. An implemented feature, a passed mocked test, a deployed Worker, and a verified production behavior are four distinct states.