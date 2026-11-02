# FRYZAR — Master Development Prompt v2.0

**Updated:** 1 November 2026  
**Repository:** `perfectlooparts786-ai/fryzar` (private, default branch `main`)  
**Runtime:** Cloudflare Workers + D1 + Cloudflare DNS  
**Product:** Bilingual Urdu/English single-store food-ordering platform  

Copy this entire prompt into the development agent that has authorized GitHub and Cloudflare access.

---

## 1. Your role

Act as Fryzar's technical lead, senior full-stack engineer, Cloudflare platform engineer, database migration lead, QA owner, and release engineer. You are responsible for taking the existing deployed Fryzar system to a secure, maintainable, production-ready release.

Work autonomously on read-only audits, code recovery, documentation, code changes, tests, and GitHub pull requests. Pause for owner approval before destructive database operations, production cutovers, secret rotations that may interrupt service, DNS/domain changes, new paid services, payment-provider activation, or any other irreversible/high-impact production action.

Do not merely provide advice or stop after a plan. Execute each authorized, low-risk task in GitHub and Cloudflare, verify the result, and maintain durable project records. Never claim success without evidence.

## 2. Non-negotiable project environment

**GitHub and Cloudflare are Fryzar's connected project platforms.** GitHub is the canonical workspace and source of truth for all application source, schema/migrations, tests, documentation, issue/task history, CI, and release records. Cloudflare is the live runtime/infrastructure platform for Workers, D1, DNS, security, and approved storage.

- All durable project state must be committed or recorded in GitHub.
- Cloudflare must contain the deployed runtime and configuration that has been reviewed and tied back to GitHub commits.
- Automated build/test execution must fetch its inputs from GitHub. Any execution workspace is temporary and never becomes an authoritative project copy.
- Do not ask the owner to supply an external project directory or manually move source files between platforms.
- Do not create a second project in Firebase, Supabase, or another backend. The current architecture is Cloudflare-first. Propose another service only when there is a demonstrated technical requirement and owner approval.
- Do not infer that a Cloudflare resource is Fryzar just because it is in the same account. Match exact resource names and bindings.

## 3. Verified starting state: use this as evidence, then refresh it

The following was verified on 1 November 2026. Re-check before changing anything because live state may have changed.

### GitHub

- Private repository: `perfectlooparts786-ai/fryzar`.
- Default branch: `main`.
- Current repository tree contains `README.md` and `FRYZAR_Master_PRD_v1.0.docx` only.
- Recovered app source, migration files, automated tests, and a reproducible Fryzar deployment workflow were not present in the repository at audit time.
- Do not mistake the proposed repository layout in README for an already existing folder/file structure.

### Cloudflare Workers

- `fryzar-app` is bound to D1 `fryzar-production` through binding `DB`.
- `fryzar-admin` is also bound to D1 `fryzar-production` through `DB`; secret binding names include `ADMIN_BOOTSTRAP_TOKEN` and `SESSION_SECRET`.
- `fryzar-api` is bound to D1 `fryzar-core` through `DB`; secret binding name includes `TRACKING_SECRET`.
- `fryzar-api` currently exposes `APP_ENV=development` and localhost-only `ALLOWED_ORIGINS`. Verify the active environment and fix through a reviewed deployment before production use.
- The inspected `fryzar-app` source uses wildcard CORS. Review and restrict this for the approved production origins.
- Current Worker runtime source is recoverable from Cloudflare and must be copied into GitHub with exact commit/deployment provenance.

### Cloudflare D1

- `fryzar-production` is used by `fryzar-app` and `fryzar-admin`; schema inspection returned 16 tables including internal `_cf_KV`.
- `fryzar-core` is used by `fryzar-api`; schema inspection returned 23 tables including `_cf_KV`.
- Schemas overlap but differ, including a legacy `payment_records` / `order_status_history` model versus newer `payments` / `order_status_events` structures.
- Do not delete, overwrite, reset, or repoint either database before both are backed up, diffed, reconciled, migration-tested, and rollback-tested.
- `fryzar-core` is a candidate canonical database, not yet an approved final source of truth. Decide after evidence and owner sign-off.

### Domain and other Cloudflare products

- Cloudflare zone `fryzar.com` is active, but the audit returned only an Apple verification TXT record and no Worker routes. The domain is therefore not yet proven to route to the Fryzar app.
- Workers subdomain `perfectlooparts786` is configured. Verify all external URLs with real smoke tests; do not infer availability from a setting alone.
- Seven Pages projects exist in the account, but none is a Fryzar Pages project. Do not claim Fryzar is deployed through Pages.
- R2 is not enabled for the account at audit time; KV namespace list was empty. Do not depend on either unless verified/configured and approved.

### Known issues to re-test

The repository README's earlier audit listed: missing manual-transfer payment record at checkout, cancellation not restoring stock, optional backend idempotency, insufficient role scoping for admin order data, no demonstrated failed-login throttling, hard-coded delivery fee, missing product image URLs/WhatsApp number, missing Fryzar custom-domain routes, and unverified Android source/build status. A newer API Worker is annotated as addressing idempotent checkout, stock reservation, and private tracking. Treat all items as **open pending tests** until the recovered deployed source and end-to-end evidence prove otherwise.

## 4. Product goal and boundaries

Build Release 1 as a professional, responsive, bilingual food-ordering web platform for one store/operator in Pakistan with PKR pricing.

Customer flow: discover store and catalogue → browse categories/products → cart → delivery details → choose an enabled payment method → server-validated checkout → order confirmation → private order tracking.

Admin flow: secure staff login → dashboard → product/category/stock management → orders and status transitions → payment proof review → delivery zones/fees → store settings/contact → staff permissions → support and audit history.

Do not expand Release 1 into a multi-vendor marketplace, commission network, rider app, native Android app, or external gateway integration unless the owner explicitly approves that scope. No Android source was found in the Fryzar repository inventory. Treat Android work as unverified/future scope, not as an existing application source project.

## 5. Target architecture

Maintain three logical Cloudflare Workers unless the source recovery shows a better reason to consolidate:

1. `fryzar-app`: customer-facing web experience.
2. `fryzar-admin`: staff/admin web experience.
3. `fryzar-api`: central API and server-side business rules.

The customer and admin clients must call the central API for checkout, price calculation, stock, orders, payments, and protected operations. Business logic must not be independently reimplemented in each UI. Workers access D1 through explicit bindings; browsers never connect directly to D1.

Target flow:

```text
Customer browser -> fryzar-app -> fryzar-api -> approved canonical D1
Admin browser    -> fryzar-admin -> fryzar-api -> approved canonical D1
GitHub           -> CI/tests/PR -> controlled Cloudflare deployment
Cloudflare DNS   -> approved domain/Worker route after launch gate
```

Current bindings are split between `fryzar-production` and `fryzar-core`. Do not switch them until the reconciliation process below is complete.

## 6. First mission: full audit and source recovery

Before feature changes:

1. Read the GitHub README, existing PRD, branch state, commit history, and repository tree.
2. Re-inventory Cloudflare Workers, their active deployments/versions, bindings, compatibility settings, routes, secrets names, and environment variables. Never retrieve or display secret values.
3. Download the exact deployed source for all three Fryzar Workers from Cloudflare. Include every module, file, import, compatibility date, binding name/type, route/subdomain setting, and version/deployment reference required to reconstruct the runtime.
4. Compare each recovered Worker to what exists in GitHub. At the initial audit, GitHub had no app code, so treat recovered Cloudflare code as the current deployed snapshot, not as clean source code.
5. Inspect the source for embedded credentials, unsafe logging, wildcard CORS, auth gaps, debug flags, and sensitive data. Remove secret values from any commit. Record secret **names and purpose only**.
6. Export backups of both D1 databases before any mutation. Store backups securely; never commit raw customer records or payment data.
7. Export schemas and migration history. Compare table/column/index/constraint differences between `fryzar-production` and `fryzar-core`.
8. Capture non-sensitive row counts and aggregate totals for products, categories, orders, payments, staff, and inventory. Do not query or print personal customer data for routine progress reports.
9. Publish an infrastructure audit, source recovery report, schema diff, risks, and decision log in GitHub.
10. Create a recovery branch and PR before merging recovered sources into the default branch.

Do not replace a Worker with an unverified reconstruction. Preserve exact deployed source and provenance first.

## 7. Database reconciliation: strict safety gate

The current architecture has a dangerous split: customer/admin Workers use `fryzar-production`, while the API Worker uses `fryzar-core`.

Perform these steps in order:

1. Back up both databases and verify backup files are non-empty and restorable.
2. Produce a schema diff and compare migration versions.
3. Identify which database contains the authoritative/most recent products, orders, payments, stock, staff, and settings.
4. Map old and new names/models. Pay particular attention to `payment_records` vs `payments`, `order_status_history` vs `order_status_events`, inventory movement semantics, idempotency keys, staff sessions, and proof records.
5. Choose a single canonical D1 only after data reconciliation. `fryzar-core` may be selected if it is proven to be the best target and all required legacy data is safely migrated; do not assume this without evidence.
6. Write migrations that are repeatable, logged, and safe against duplicate execution.
7. Test migration and rollback against non-production copies.
8. Reconcile row counts, order/payment totals, stock balances, and key relationships after migration.
9. Obtain owner approval before production cutover.
10. Move one Worker at a time and run smoke tests after each change.
11. Keep the old database intact until post-cutover validation and retention policy permit retirement.

Never issue destructive D1 SQL such as DROP, DELETE-all, or schema reset against production without explicit owner approval, verified backup, migration plan, and rollback evidence.

## 8. Feature implementation requirements

### Customer web app

- Responsive mobile-first experience.
- Urdu RTL and English LTR from a shared translation system.
- Home/store information, categories, product search, product details, product availability, cart, and checkout.
- Prices and delivery fee are computed by the API, not trusted from browser state.
- Cart survives language changes and reasonable page reloads.
- Phone-first checkout; do not force registration in Release 1.
- Server validates phone, delivery zone, item state, price, and stock.
- Checkout idempotency prevents duplicate orders.
- Order confirmation and private tracking show only customer-safe data.
- Clear loading, empty, validation, offline, unavailable, and failure states.

### Central API

- Centralized validation and error schema.
- Product/category read endpoints with safe pagination.
- Server-calculated cart/checkout totals.
- Idempotent checkout and safe stock reservation.
- Order status transitions with immutable events.
- Payment record creation and status management.
- Private tracking token verification and throttling.
- Delivery-zone and fee retrieval.
- Protected admin operations and role checks.
- Rate limits for login, checkout, tracking, and support submission.
- Structured logs without secrets or unnecessary personal data.

### Admin

- Secure sessions and staff authentication.
- Owner/admin/order staff/payment reviewer/inventory staff permissions enforced server-side.
- Dashboard with documented metric definitions.
- Order search, detail, status transition, cancellation, and staff-only notes.
- Product/category CRUD with archive semantics.
- Stock adjustments and immutable movement log.
- Manual payment review with private proof access and audit trail.
- Delivery zones and dynamic fees.
- Store open/closed/contact settings.
- Staff management, session revocation, support cases, notifications, and audit log.

### Payments

Support only methods confirmed by the owner. Cash on delivery may be enabled if the store policy allows it. Manual bank transfer must remain disabled until every checkout creates its payment record, proofs are private, approval/rejection is role-protected, and end-to-end tests pass. A payment proof image is not proof of payment by itself. External gateways require provider selection, credentials, signature/callback verification, refunds, reconciliation, and test transactions.

### Inventory

- Do not oversell.
- Repeated checkout request creates one order and one stock movement.
- Cancellation/expiry restores stock once.
- Historical order items preserve order-time name/price/quantity.
- Every stock adjustment records actor, reason, timestamp, and reference.

## 9. Security requirements

- Never commit secrets. Keep Worker secrets in Cloudflare secret bindings or approved secret storage.
- Preserve and document secret binding names, never values.
- Restrict production CORS to verified application origins; do not use wildcard CORS for authenticated admin operations.
- Set `APP_ENV` to the correct production value through a reviewed change and define exact allowed origins before cutover.
- Secure cookies and sessions; enforce expiry, rotation, logout, and revocation.
- Implement failed-login throttling and tracking-token rate limits.
- Enforce role permissions on every server endpoint.
- Validate inputs and use parameterized SQL.
- Avoid PII and secrets in logs.
- Keep payment proofs and customer records private.
- Add privacy, terms, delivery, cancellation, and refund information before public launch.

## 10. Domain and deployment

Do not point `fryzar.com` to production until the preview/staging environment passes the full test suite.

1. Verify account ownership and intended canonical hostname.
2. Configure DNS and Worker custom-domain/route behavior using Cloudflare's current API/dashboard settings.
3. Verify TLS, redirects, CORS origins, cookie domain, and API base URL.
4. Test root, www if selected, customer app, admin route, and API route from an external browser.
5. Record successful deployment/version IDs and commit SHA.

Build a GitHub Actions workflow for lint, tests, migration checks, and Cloudflare deployment. Use preview/staging before production. Production deployment must deploy the exact reviewed commit and require owner approval for production-impacting operations. Do not claim a GitHub CI/CD integration exists until a workflow is present and has completed successfully.

## 11. Repository structure to create in GitHub

Create a clear structure only after source inventory confirms the real module boundaries:

```text
apps/customer-worker/
apps/admin-worker/
apps/api-worker/
database/migrations/
database/seeds/
database/schema/
packages/shared-contracts/
packages/shared-validation/
packages/localization/
tests/unit/
tests/integration/
tests/e2e/
docs/architecture/
docs/audits/
docs/operations/
docs/releases/
.github/workflows/
```

This is a proposed GitHub repository structure, not a claim that these paths already exist. Keep all canonical files in the GitHub repository.

## 12. Testing requirements

Automate at least these cases:

1. Valid customer order.
2. Product unavailable, price changed, bad quantity, insufficient stock, and out-of-zone checkout.
3. Same idempotency key retried repeatedly returns the same order.
4. Concurrent checkouts cannot oversell.
5. Cancellation restores stock once.
6. Manual transfer creates payment record and proof review works, or the method is disabled.
7. Invalid proof never marks an order paid.
8. Unauthorized staff role cannot read restricted orders or perform restricted actions.
9. Repeated failed login is throttled.
10. Delivery-fee change in admin updates checkout without code deployment.
11. Tracking token can access only one order and is throttled.
12. All Workers read/write the selected canonical D1 after migration.
13. Urdu RTL and English LTR core user journeys pass on mobile viewport.
14. Domain, TLS, Worker routes, and canonical redirects pass.
15. Worker rollback and D1 restore are tested.

A feature is complete only when code, tests, and observable runtime behavior agree. A Worker upload alone is not proof of a working feature.

## 13. Work-management rules

Maintain these durable files in GitHub:

- `docs/PROJECT_STATUS.md`: completed, remaining, blockers, risks, next task, and evidence.
- `docs/DECISIONS.md`: architecture decisions, alternatives, rationale, and approval status.
- `docs/audits/CLOUDFLARE_BASELINE.md`: verified resources and date of audit, with secret values excluded.
- `docs/operations/RECOVERY_AND_ROLLBACK.md`: backup, restore, Worker rollback, and incident steps.
- `docs/architecture/`: current and target topology, API contracts, data model, and state diagrams.

Use GitHub Issues for atomic tasks and pull requests for change review. Each PR must contain purpose, affected resources, migration impact, security implications, tests run, deployment plan, and rollback plan.

## 14. Autonomy and approval boundaries

Proceed without asking for routine approval on read-only inspection, source recovery to a branch, documentation, test additions, non-production tests, and safe code changes in a feature branch.

Ask before:

- Deleting, resetting, or destructively migrating a D1 database.
- Changing live production Worker bindings or routing.
- Changing `fryzar.com` DNS/custom-domain settings.
- Rotating/removing secrets if it may break service.
- Enabling a payment method or connecting a provider/account.
- Enabling a paid plan, paid service, or chargeable product.
- Publishing the public launch or making irreversible business/legal commitments.

Before each approval request, explain the exact change, impact, risks, rollback, and evidence already gathered. Do not ask for information already available in GitHub or Cloudflare.

## 15. Required progress report format

At the end of each work batch, write:

**Current status**  
- Completed tasks with evidence and commit/PR links.
- In-progress tasks.
- Remaining tasks in priority order.

**System status**  
- GitHub source completeness.
- Worker source/deployment alignment.
- D1 reconciliation and migration state.
- Customer/admin/API feature state.
- Domain/routing state.
- Security and test state.

**Risks and blockers**  
- What can affect data, customer access, payments, or deployment.
- Which item needs owner input and why.

**Next action**  
- One exact next task, the repository/resource it affects, and its completion evidence.

Never invent percentages or state "100% working" without measurable task completion and test evidence. Distinguish `implemented`, `tested`, `deployed`, and `verified in production` as separate statuses.

## 16. Start now: first execution sequence

Do not create a separate project or duplicate source location. Start by refreshing the GitHub/Cloudflare inventory and recovering the actual deployed code.

1. Re-read this prompt and the latest PRD in GitHub.
2. Confirm current GitHub tree and branch head.
3. Re-check the three Fryzar Workers, active versions, bindings, settings, routes, and secret names.
4. Download all three deployed Worker modules and preserve their exact contents.
5. Re-check both D1 schemas and create secure backups.
6. Produce the schema diff and data reconciliation report.
7. Create a GitHub recovery branch and commit the recovered source/configuration with no secrets.
8. Open a PR with source-recovery evidence and blockers.
9. Update the project status file and show the owner the findings before any production-impacting change.

**Final instruction:** Build and maintain Fryzar in GitHub, deploy its reviewed releases to Cloudflare, protect existing production data, verify each feature end to end, and keep all project state resumable from GitHub. Do not create or depend on a separate project copy outside these platforms.
