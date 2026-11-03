# FRYZAR Master Execution Tracker

**Single source of truth for implementation sequencing.** Update this file after every meaningful task and commit. When the user says **"next"**, continue the first actionable unchecked task below. Do not ask the user to restate the plan.

## Operating rules

- Repository: `perfectlooparts786-ai/fryzar`
- Active development branch: `foundation/fresh-build`
- Keep PR #1 open, draft and unmerged unless the user explicitly changes that instruction.
- Work against GitHub repository contents and CI. Do not assume a local source tree exists on the user's computer.
- Make small, focused commits. Run relevant tests and verify the final branch-head CI before marking a task complete.
- Use the labels **COMPLETE**, **IN PROGRESS**, **IMPLEMENTED / CI PENDING**, **BLOCKED**, and **NOT STARTED**.
- Do not claim runtime behavior is verified merely because code compiles. Add tests and record evidence.
- No production Worker, D1, secrets, DNS, payment configuration, or legacy service changes.
- No remote preview deployment, remote D1 mutation, owner bootstrap, real order, or payment action without explicit user authorization.
- Never expose secrets. Use only synthetic data in tests.
- Keep preview and production strictly isolated. The existing preview deployment pin is historical; do not silently move it to current HEAD.

## Current verified baseline (3 November 2026)

- Branch HEAD: `d8aa96f0a5404267e9c4950537e61ab94ef4b4c6`
- PR #1: open, draft, unmerged.
- CI run [41648726626](https://github.com/perfectlooparts786-ai/fryzar/actions/runs/41648726626): **SUCCESS** on the HEAD above.
- CI passed API/routing tests, local D1 checkout/cancellation/bootstrap/session/financial/retention/migration suites, the new local backup/restore rehearsal, preview-only config safety, storefront/admin builds, and all three Worker dry-runs.
- Local D1 snapshot/restore test is verified in CI. It does **not** establish a remote Cloudflare D1 backup/restore or PITR recovery drill.
- No deployment or remote D1 write occurred in this batch. Production remains untouched.

## Execution queue

### Phase 3: Repository, operations and release engineering

- [x] P3-01 Repository and environment separation audit. **COMPLETE**
- [x] P3-02 CI concurrency, timeout, checkout credential and npm lockfile/CI validation. **COMPLETE**
- [x] P3-03 Migration order, schema, indexes, triggers and FK integrity test. **COMPLETE**
- [x] P3-04 Preview-only Worker/D1 configuration safety test. **COMPLETE**
- [x] P3-05 Local disposable D1 backup/restore snapshot rehearsal and CI integration. **COMPLETE** (CI run 41648726626)
- [ ] P3-06 Review manual preview deployment workflow end-to-end, document exact safety gates and candidate pin. **PARTIAL**
- [ ] P3-07 Define remote D1 recovery/PITR procedure, retention, RPO/RTO and operator approval checklist. **NOT STARTED** (documentation/design first; no remote operation)
- [ ] P3-08 Add browser E2E test harness and deterministic local test setup. **NOT STARTED**
- [ ] P3-09 Add browser E2E coverage for storefront navigation, bilingual/RTL, cart and guest checkout. **NOT STARTED**
- [ ] P3-10 Add browser E2E coverage for admin auth, role access, catalogue and order operations. **NOT STARTED**
- [ ] P3-11 Accessibility, responsive, keyboard and browser compatibility verification. **PARTIAL**
- [ ] P3-12 Security/privacy regression review and release gate reconciliation. **NOT STARTED**
- [ ] P3-13 Phase 3 closeout report with verified evidence and remaining blockers. **NOT STARTED**

### Phase 4: Customer ordering experience

- [ ] P4-01 Audit existing customer UI and API against acceptance criteria. **NOT STARTED**
- [ ] P4-02 Improve homepage, navigation, category discovery and product cards. **NOT STARTED**
- [ ] P4-03 Search, filters, sorting and empty/error/loading states. **NOT STARTED**
- [ ] P4-04 Product detail, gallery, options/modifiers and availability UX. **NOT STARTED**
- [ ] P4-05 Cart persistence, quantity changes, validation and totals. **NOT STARTED**
- [ ] P4-06 Delivery-zone/address validation and fee/minimum calculation UX. **NOT STARTED**
- [ ] P4-07 Guest checkout form, server validation, idempotency and error recovery. **NOT STARTED**
- [ ] P4-08 Order confirmation and private-token tracking experience. **NOT STARTED**
- [ ] P4-09 Urdu/English parity, RTL/LTR, mobile and accessibility E2E. **NOT STARTED**

### Phase 5: Admin and store operations

- [ ] P5-01 Audit admin routes, permissions and UI completeness. **NOT STARTED**
- [ ] P5-02 Dashboard metrics and operational summaries. **NOT STARTED**
- [ ] P5-03 Catalogue/category/product management and image lifecycle. **NOT STARTED**
- [ ] P5-04 Inventory movements, low-stock visibility and audit history. **NOT STARTED**
- [ ] P5-05 Order queue, filters, detail, status transitions and cancellation. **NOT STARTED**
- [ ] P5-06 Staff roles, least privilege, session lifecycle and admin UX. **NOT STARTED**
- [ ] P5-07 Store settings, delivery zones, hours and ordering availability. **NOT STARTED**
- [ ] P5-08 Admin E2E, permissions and audit verification. **NOT STARTED**

### Phase 6: Payments and finance

- [ ] P6-01 Formal payment state-transition matrix and invariants. **NOT STARTED**
- [ ] P6-02 COD collection workflow and reconciliation. **PARTIAL**
- [ ] P6-03 Manual bank/wallet transfer instructions and private proof upload/review. **NOT STARTED**
- [ ] P6-04 Refund/reversal state model and immutable finance ledger. **NOT STARTED**
- [ ] P6-05 Finance reports, reconciliation exports and access controls. **NOT STARTED**
- [ ] P6-06 Payment abuse, replay, duplicate and failure-path tests. **NOT STARTED**
- [ ] P6-07 Gateway integration only after provider, credentials, compliance and explicit approval. **BLOCKED / NOT AUTHORIZED**

### Phase 7: Notifications and support

- [ ] P7-01 Notification event model, in-app inbox and preferences. **NOT STARTED**
- [ ] P7-02 Customer/staff order notifications with provider abstraction. **NOT STARTED**
- [ ] P7-03 Support cases, assignment, status and conversation workflow. **NOT STARTED**
- [ ] P7-04 Delivery failure, retry, deduplication and observability tests. **NOT STARTED**

### Phase 8: Media, discovery and performance

- [ ] P8-01 R2 bucket and binding design, upload authorization and image validation. **NOT STARTED**
- [ ] P8-02 Product image upload/replace/delete lifecycle and safe public delivery. **NOT STARTED**
- [ ] P8-03 SEO metadata, sitemap, robots and share previews. **NOT STARTED**
- [ ] P8-04 PWA manifest, installability and offline-safe fallback. **NOT STARTED**
- [ ] P8-05 Performance budgets, caching and Core Web Vitals review. **NOT STARTED**

### Phase 9: Quality and security

- [ ] P9-01 Full browser E2E suite across supported viewport sizes. **NOT STARTED**
- [ ] P9-02 Urdu RTL and English LTR visual regression. **NOT STARTED**
- [ ] P9-03 Accessibility checks and manual keyboard/screen-reader review. **NOT STARTED**
- [ ] P9-04 API authorization, validation, rate-limit and privacy regression. **NOT STARTED**
- [ ] P9-05 Dependency, secret, headers, CORS and Worker configuration audit. **NOT STARTED**
- [ ] P9-06 Load/concurrency tests for checkout, stock and order transitions. **NOT STARTED**
- [ ] P9-07 Observability, alerting, backup monitoring and incident runbook. **NOT STARTED**

### Phase 10: Controlled release readiness

- [ ] P10-01 Real store content, menu, prices, images, delivery zones and support details supplied/approved. **BLOCKED: owner inputs**
- [ ] P10-02 Preview-only smoke test on an explicitly approved candidate. **NOT STARTED / requires authorization**
- [ ] P10-03 Owner bootstrap and staff setup on preview only. **NOT STARTED / requires authorization**
- [ ] P10-04 End-to-end test orders with synthetic/test-only data and verified payment behavior. **NOT STARTED / requires authorization**
- [ ] P10-05 Production migration, backup, rollback and cutover plan. **NOT STARTED**
- [ ] P10-06 Explicit production release approval. **BLOCKED: user approval required**
- [ ] P10-07 Production smoke tests and post-release monitoring. **NOT STARTED / gated**

## Immediate next task

**P3-06: deployment workflow review and safety-gate documentation.** Inspect the exact workflow source, referenced scripts, permissions, environment protection, commit pin, secrets handling, D1 migration behavior and smoke checks. Document what it does and does not do. Do not run it or change its deployment target.

## How to continue

When the user sends **"next"**:
1. Read this tracker and check current branch HEAD/CI.
2. Pick the first unchecked actionable item in sequence.
3. Implement it directly in the repository where safe.
4. Run the narrow tests and CI.
5. Update this tracker with status, commit SHA, evidence and the next item.
6. Report only the work completed, verification evidence, blockers and next task.

If an item needs credentials, real business data, payment provider access, a remote mutation, deployment, or production approval, do all safe preparatory work and mark only that gated action as blocked. Continue with other safe work where possible.
