# FRYZAR — Master Product Requirements Document

**Version:** 2.0  
**Updated:** 1 November 2026  
**Status:** Corrected architecture baseline and production recovery plan  
**Supersedes:** `FRYZAR_Master_PRD_v1.0.docx`  
**Canonical project repository:** `perfectlooparts786-ai/fryzar` (private, `main`)  
**Runtime and infrastructure platform:** Cloudflare  

> **Important status statement:** This document describes the target product and the verified recovery/development direction. It does not claim that Fryzar is production-ready. The deployed Workers and D1 databases exist in Cloudflare, but the GitHub repository does not yet contain the recovered application source, migrations, test suite, or reproducible deployment configuration.

---

## 1. Executive summary

FRYZAR is a bilingual Urdu and English food-ordering platform for a single store/operator, initially serving customers in Pakistan with PKR pricing. Customers should be able to discover available food products, browse categories, build a cart, provide delivery details, place an order, choose an enabled payment method, and follow order progress. Authorized staff should be able to manage products, stock, orders, payment verification, delivery zones, store settings, and support from a secure admin experience.

The project must be developed and operated around the infrastructure that actually exists:

- **GitHub is the canonical project workspace and single source of truth** for application source, migrations, tests, documentation, task history, release records, and deployment workflows.
- **Cloudflare is the live hosting and runtime platform** for Workers, D1, DNS, security, and any later approved storage/edge services.
- **All durable project state must remain in GitHub.** Development sessions, automated tasks, recovery work, and handovers must resume from the repository, issues, pull requests, and recorded decisions. Any temporary build/test execution environment is generated from GitHub and is never authoritative.
- The current live runtime has three Fryzar Workers and two D1 databases. Their bindings are split, so the immediate technical priority is safe source recovery and database reconciliation.

The first release is a reliable single-store ordering system, not a multi-vendor marketplace. Marketplace commissions, multiple merchant accounts, rider applications, native Android distribution, and advanced loyalty features are future options and must not delay the secure ordering MVP.

## 2. Product vision and objectives

### 2.1 Vision

Deliver a trustworthy, fast, mobile-first food-ordering experience that works naturally in Urdu and English, supports right-to-left and left-to-right layouts, and gives the store operator accurate control over orders, payments, stock, delivery charges, and customer communication.

### 2.2 Primary objectives

1. Let a customer complete an order on a mobile browser without needing a mandatory account-registration process.
2. Keep product availability, delivery fee, stock, order status, and payment status consistent between the customer experience and admin console.
3. Prevent duplicate orders on retries and prevent overselling through server-side idempotency and atomic inventory operations.
4. Give staff a secure, auditable workflow for order handling and payment verification.
5. Make Urdu/English localization a core feature, not a later translation patch.
6. Make every code change traceable in GitHub and every production deployment traceable to a GitHub commit.
7. Preserve current production data and deployed services while source recovery and database consolidation are in progress.

### 2.3 Success metrics

The following are proposed release targets, not current measured results:

| Area | Acceptance target |
|---|---|
| Checkout reliability | No duplicate order for a repeated idempotency key; retry behavior covered by automated tests |
| Inventory | No negative stock from concurrent checkout; cancellation/restock behavior tested |
| Payment | Every order has a consistent payment state and auditable payment history |
| Localization | All customer and admin critical flows usable in Urdu RTL and English LTR |
| Mobile UX | Core ordering flow works at 360px viewport width without horizontal overflow |
| Security | No known critical/high application security finding left open at release gate |
| Availability | Operational target of at least 99.5% monthly availability after launch, subject to monitoring and platform plan |
| Deployment | Production release linked to an exact GitHub commit and successful smoke-test record |

## 3. Verified project and infrastructure baseline

This section records the state observed during the 1 November 2026 audit. Resource names are listed for orientation. Secret values, database contents containing personal data, and customer records are intentionally excluded.

### 3.1 GitHub repository

| Item | Verified state |
|---|---|
| Repository | `perfectlooparts786-ai/fryzar` |
| Visibility | Private |
| Default branch | `main` |
| Files currently present at repository root | `README.md`, `FRYZAR_Master_PRD_v1.0.docx` |
| Application source in this repository | Not present at audit time |
| Database migrations in this repository | Not present at audit time |
| Automated tests in this repository | Not present at audit time |
| Reproducible Worker configuration / deployment workflow | Not present at audit time |

The repository README describes a future directory structure. That layout must be treated as a plan, not as files already recovered.

### 3.2 Cloudflare Workers

The account contains these deployed Fryzar Workers:

| Worker | Current binding / configuration observation | Required interpretation |
|---|---|---|
| `fryzar-app` | D1 binding `DB` points to `fryzar-production`; worker.dev subdomain enabled | Existing customer-facing application Worker; recover its exact deployed source before changing it |
| `fryzar-admin` | D1 binding `DB` points to `fryzar-production`; secret bindings named `ADMIN_BOOTSTRAP_TOKEN` and `SESSION_SECRET` | Existing admin Worker; recover source and document secret names only, never values |
| `fryzar-api` | D1 binding `DB` points to `fryzar-core`; `APP_ENV` is currently `development`; `ALLOWED_ORIGINS` currently contains localhost origins; secret binding `TRACKING_SECRET` | Newer API Worker; source recovery and production configuration review are mandatory |

All three workers have deployed versions in Cloudflare. Their deployed code is recoverable from the Cloudflare Worker script content API and must be exported into GitHub with a commit-level record. Cloudflare runtime code is not a replacement for version control.

**Security observations requiring review:**

- The inspected `fryzar-app` source begins with permissive `Access-Control-Allow-Origin: *`. Confirm whether that behavior is required; restrict CORS to explicit approved origins for production.
- The `fryzar-api` bindings show `APP_ENV=development` and localhost-only allowed origins. This must not be assumed suitable for public production traffic.
- Admin secret binding names are known, but secret values must never be fetched into logs, GitHub, documents, or prompts.
- Worker deployments currently show API/upload-based deployment activity. A reproducible GitHub-driven deployment process is not yet evidenced for Fryzar.

### 3.3 Cloudflare D1 databases

Two Fryzar D1 databases exist and are bound to different Workers:

| Database | Current consumer | Schema observation |
|---|---|---|
| `fryzar-production` | `fryzar-app` and `fryzar-admin` | 16 SQLite tables returned by schema inspection, including Cloudflare's internal `_cf_KV` table |
| `fryzar-core` | `fryzar-api` | 23 SQLite tables returned by schema inspection, including Cloudflare's internal `_cf_KV` table |

The schemas are not identical. Examples of core database areas include products, categories, orders, payments, payment proofs, product images, inventory movements/adjustments, idempotency keys, staff users/sessions, rate-limit records, audit logs, notifications, store settings, delivery zones, support cases, and order status events. The legacy production database has overlapping but differently named structures, including `payment_records` and `order_status_history`.

**Database rule:** Do not delete either database, overwrite either database, or point a production Worker at a different database until both databases have been exported/backed up, schema-diffed, row counts reconciled, migration tested, and rollback verified. `fryzar-core` is the likely target for the newer API architecture, but it is not formally declared the sole canonical production database until the data-reconciliation gate passes.

### 3.4 Domain, routes, Pages, and storage

| Resource | Verified observation | Consequence |
|---|---|---|
| Cloudflare zone `fryzar.com` | Zone is active | Domain exists in Cloudflare |
| `fryzar.com` DNS records | Only an Apple domain-verification TXT record was returned in the audit | No customer-facing DNS record was evidenced |
| Worker routes on the `fryzar.com` zone | Empty list | No zone Worker route currently connects the domain to a Fryzar Worker |
| Account Workers subdomain | `perfectlooparts786` is configured | Worker subdomains are enabled; exact public app availability still needs live smoke testing |
| Cloudflare Pages | Seven Pages projects exist, but none is named Fryzar | Do not describe an existing Fryzar Pages deployment |
| R2 | API reports R2 needs to be enabled in the dashboard | R2 is not currently an available Fryzar asset store; enable only if needed and approved |
| KV namespaces | No account KV namespaces returned | Do not assume KV is configured |

The custom domain is not production-connected merely because its Cloudflare zone is active. Domain DNS, TLS, Worker custom-domain/route configuration, canonical URLs, and end-to-end checks are a separate release gate.

### 3.5 Prior audit findings that must be re-tested

The current repository README records these findings from the earlier implementation audit:

1. Manual bank-transfer checkout did not create the payment record required by admin verification.
2. Order cancellation did not restore reserved stock.
3. Backend idempotency was optional.
4. Admin order access did not demonstrate sufficiently narrow role-based restrictions.
5. Admin login did not demonstrate failed-login throttling.
6. Delivery fee display used a hard-coded value rather than the database setting.
7. Product image URLs and the store WhatsApp number were not populated.
8. The production zone did not have verified Worker custom-domain routes.
9. Android application source/build status had not been established.

The newer `fryzar-api` Worker is annotated as addressing idempotent checkout, stock reservation, and private-token tracking. Database tables also suggest work has progressed. However, code annotations and table presence are not proof that customer/admin workflows are fully integrated or tested. Re-run these tests against the recovered code and the actual active Worker versions. Keep each finding open until evidence proves it is fixed.

## 4. Scope and product boundaries

### 4.1 Release 1: single-store ordering MVP

Included:

- Responsive customer web application.
- Urdu and English, including proper RTL/LTR handling.
- Store homepage, categories, products, product details, search/filter, cart, checkout, and order tracking.
- Phone-first customer checkout; no mandatory account registration in the baseline flow.
- Delivery-zone eligibility and database-driven delivery charges.
- Order creation with idempotency and inventory safeguards.
- Explicit payment status and payment verification workflows.
- Secure admin dashboard for store operations.
- Product/category/image management, stock adjustments, orders, payment proofs, delivery zones, store settings, staff access, support, and audit history.
- GitHub version control, automated checks, controlled Cloudflare deployment, monitoring, and recovery documentation.

### 4.2 Explicitly not assumed for Release 1

- Multi-vendor or marketplace onboarding.
- Merchant commission splitting or a platform wallet.
- A separate rider/delivery-partner mobile app.
- Native Android app or Play Store release. No Android source repository was found in the Fryzar repository inventory.
- Firebase as a backend or database.
- Supabase, a self-hosted server, or another database outside Cloudflare.
- Payment gateway accounts or credentials that have not been provided and verified.
- R2 object storage before it is enabled and a storage decision is approved.

These can be evaluated in later releases without destabilizing the single-store MVP.

## 5. Users, roles, and permissions

### 5.1 Customer

A customer can browse products, manage a cart, submit delivery details, place an order, view a private order-tracking page, and contact the store. The customer must only be able to view their own order through a hard-to-guess, revocable/rotatable tracking token or a later verified account system.

### 5.2 Staff roles

Define permissions server-side. UI hiding alone is not authorization.

| Role | Intended permissions |
|---|---|
| Owner / Super Admin | All store operations, staff management, sensitive settings, audit access, and release/configuration visibility |
| Admin / Manager | Orders, products, categories, delivery zones, stock, payment review, support, and permitted reports |
| Order Staff | View and update assigned/allowed order operations; no access to secrets or staff administration |
| Payment Reviewer | View payment records/proofs and record verification decisions; no unrestricted staff/security settings |
| Inventory Staff | View products and perform approved stock adjustments; no payment or staff-account administration |

Role names and exact permission matrix must be aligned with the current staff schema before production rollout. Least privilege is mandatory.

## 6. Customer application requirements

### 6.1 Global shell and navigation

- Mobile-first layout with accessible touch targets.
- Clear store identity, availability/open status, delivery coverage, and contact information.
- Urdu/English language control available without losing cart state.
- Direction changes from RTL to LTR with language selection, including mixed Urdu/Latin numbers and phone fields.
- Persistent cart entry and clear checkout progress.
- Loading, empty, offline, validation, and server-error states for every major screen.

### 6.2 Home and discovery

- Store banner and concise service information.
- Active categories and featured/available products.
- Search by product name in Urdu and English where translations are available.
- Hide unavailable items from ordering or show them with a clear unavailable state; never accept an unavailable item at checkout.
- Featured labels and promotions controlled from admin settings.

### 6.3 Product catalogue and details

Each product should support:

- Stable product ID and slug.
- Urdu and English names and descriptions.
- Category, price in PKR, optional compare-at price, availability, stock policy, and sort order.
- Image URL(s), alt text, and display order.
- Optional options/add-ons only if a validated product model and checkout calculation support them.
- Active/inactive state and audit timestamps.

The customer-visible price must always be recalculated and validated by the API. Never trust totals submitted by a browser.

### 6.4 Cart

- Add, remove, and adjust quantity.
- Display item subtotal and clear unavailable/changed-price alerts.
- Preserve cart during language changes and reasonable reloads.
- Revalidate item state, quantity, price, and stock on the server during checkout.
- Prevent quantity values below one and above configured stock/maximums.

### 6.5 Checkout

Required fields should be limited to what fulfilment actually needs:

- Customer name.
- Validated phone number.
- Delivery address and delivery-zone selection/verification.
- Optional delivery instructions.
- Payment method selected from currently enabled methods.
- Explicit order review before final submission.

The server calculates item totals, discounts, delivery fee, payable amount, stock allocation, and payment state. Checkout must use an idempotency key, enforce server-side validation, and execute the order/inventory/payment writes consistently. A retry must return the original result instead of creating another order.

### 6.6 Order confirmation and tracking

- Show order number, current status, item summary, amounts, delivery summary, and payment state.
- Use a private tracking token that is stored hashed where practical and never expose sequential database IDs as authorization.
- Show status history with timestamps and customer-friendly Urdu/English labels.
- Do not leak staff notes, internal audit details, other customers' data, or payment reviewer credentials.

## 7. Admin application requirements

### 7.1 Secure authentication

- Staff sign-in with secure password hashing and session lifecycle.
- Strong session secret stored only as a Cloudflare secret binding.
- One-time owner/bootstrap process; disable or rotate bootstrap access after initial claim.
- Rate limiting and lockout/backoff for repeated failed logins.
- Session expiry, revocation, logout, and safe cookie settings.
- Server-side authorization for every protected action.
- Audit log for staff sign-in, role changes, payment decisions, stock changes, order changes, and sensitive settings.

### 7.2 Dashboard

Show operational information that is useful and computed from the database:

- Orders today and recent order states.
- Sales totals separated by order/payment state.
- Pending payment reviews.
- Low-stock/unavailable products.
- Delivery-zone and store availability alerts.
- Recent support cases and administrative activity.

Every metric needs a documented definition so the same number is consistent across dashboard and reports.

### 7.3 Order management

- Search/filter by order number, phone, date, and status with appropriate staff permission.
- View order items, address, totals, payment, and status history.
- Explicit status-transition validation; do not allow arbitrary state jumps.
- Staff notes separated from customer-visible messages.
- Cancel/refund path must release or restore inventory and preserve payment/order history.
- Record actor, timestamp, previous state, new state, and reason for every state change.

### 7.4 Product, category, and image management

- Create/edit/archive products and categories.
- Validate prices, slugs, translation fields, and stock policy.
- Set image URL and alt text; confirm each URL is public, stable, and licensed/owned before publication.
- Do not expose an upload control until the selected storage service is configured and tested.
- Avoid silently deleting a product that appears in historical orders; archive it instead.

### 7.5 Inventory management

- Maintain stock or explicitly configured made-to-order behavior per product.
- Log every adjustment with reason, actor, and reference.
- Reserve/decrement stock as part of validated order placement, using concurrency-safe transactions/conditional updates.
- On cancellation or failed payment expiry, release stock exactly once.
- Use unique movement references to stop duplicate restock movements.
- Display current stock, reserved stock if the selected model supports it, and adjustment history.

### 7.6 Payment management

- View payment records and proofs with strict role access.
- Record submitted/reviewed/approved/rejected/refunded states with actor and timestamps.
- Do not mark an order paid solely because the customer uploaded an image.
- Avoid public URLs for private payment proofs; use access-controlled delivery when storage is configured.
- Ensure every payment decision is auditable and idempotent.

### 7.7 Delivery zones and store settings

- Manage active delivery areas, service availability, and delivery charges.
- Use database settings rather than hard-coded frontend numbers.
- Define minimum order amount, delivery windows, and any temporarily unavailable zones.
- Store WhatsApp/contact details centrally and display only configured values.
- Maintain store open/closed status and exceptional holiday/suspension mode.

### 7.8 Staff, support, notifications, and audit

- Staff creation/invitation, role assignment, session revocation, and account disablement.
- Support-case list, status, priority, and staff notes.
- In-app operational notifications; external WhatsApp/SMS/email only after provider and credentials are configured.
- Searchable audit log with retention policy and protected access.

## 8. Order, payment, and inventory state models

### 8.1 Order lifecycle (target)

`created/pending_confirmation → confirmed → preparing → ready/out_for_delivery → delivered`

Alternative terminal paths include `cancelled` and `rejected`. If the store needs an intermediate `pending_payment` state for transfer, it must be explicitly modeled. The API must reject invalid transitions, record a reason for cancellation/rejection, and keep a complete event history.

### 8.2 Payment lifecycle (target)

`unpaid → pending_review (manual transfer) → verified/paid`

A reviewer may move a pending proof to `rejected`; a paid payment may later have a separate `refund_pending → refunded` process. Payment state and order state are related but must not be conflated.

For cash on delivery, record the method and due state accurately; mark it collected only when the authorized fulfilment process confirms collection. Do not present cash-on-delivery as enabled until the store operator confirms the service policy.

### 8.3 Inventory invariants

1. A successful order cannot reserve more sellable stock than exists.
2. Repeating the same checkout idempotency key cannot create a second order or second stock deduction.
3. Cancellation/expiry releases stock once and only once.
4. An order's historical item title/price/quantity must remain readable even if the product changes later.
5. Every stock-affecting operation writes a corresponding immutable movement record.

## 9. Payments and commercial model

### 9.1 Release 1 payment methods

The product should support a configurable payment-method registry. A method is available only when configured and confirmed by the owner.

- **Cash on delivery:** optional, subject to store policy and delivery coverage.
- **Manual bank transfer:** enable only after checkout creates a payment record, proof submission is private, admin review is role-protected, and success/failure/retry flows pass end-to-end tests.
- **Online payment gateway:** future integration after provider selection, merchant onboarding, credentials, callback verification, refund behavior, and test transactions are completed.

Do not invent or hard-code bank account numbers, merchant IDs, gateway credentials, payment URLs, or fees.

### 9.2 Monetization baseline

For the initial single-store business, revenue is the store's completed sales, less fulfilment/payment costs and approved discounts. Configurable delivery charges and future promotions can support commercial operations. There is no marketplace commission split in the baseline because no multi-vendor system is verified or scoped.

### 9.3 Financial integrity

- Store prices as integer minor units or an explicitly documented PKR decimal convention; avoid floating-point money arithmetic.
- Preserve order-time item prices and totals.
- Maintain immutable payment/order history and audit decisions.
- Reconcile totals between orders, payments, refunds, and reports.
- Do not expose payment proofs or customer information to unauthorised staff.

## 10. Target technical architecture

### 10.1 Platform responsibilities

| Platform component | Responsibility |
|---|---|
| GitHub private repository | Source code, migration files, tests, documentation, issues/PRs, CI checks, release tags, deployment provenance |
| Cloudflare Workers | Customer application edge runtime, admin application edge runtime, central API/business logic |
| Cloudflare D1 | Relational store data and transactional records; one formally selected canonical database after migration gate |
| Cloudflare DNS / zone | Verified public domain and routing after domain configuration gate |
| Cloudflare R2 | Optional later private/public product-image and proof storage, only after R2 is enabled and access design is approved |
| Cloudflare KV | Not currently configured; add only for a justified cache/config/session use case, not as a substitute for relational data |
| GitHub Actions | Automated lint, tests, migration validation, and controlled Cloudflare deployment |

### 10.2 Logical topology

```text
Customer browser (Urdu / English)
        |
        v
Customer web Worker: fryzar-app
        |
        | HTTPS API calls
        v
Central API Worker: fryzar-api
        |
        v
Canonical D1 database (selected only after safe reconciliation)

Admin browser
        |
        v
Admin Worker: fryzar-admin
        |
        | Authenticated, role-checked API calls
        v
Central API Worker / shared business services
        |
        v
Canonical D1 database

GitHub repository --> GitHub Actions --> preview/staging deployment --> verified production deployment
Cloudflare DNS/domain --> approved Worker routes/custom domains
```

The current implementation does not yet match this target topology because `fryzar-app` and `fryzar-admin` bind to `fryzar-production`, while `fryzar-api` binds to `fryzar-core`. The migration plan below resolves that deliberately.

### 10.3 Repository layout target

The following is a proposed GitHub repository structure, not a claim that these files exist today:

```text
fryzar/
├── apps/
│   ├── customer-worker/
│   │   ├── src/
│   │   └── wrangler.toml (or wrangler.jsonc)
│   ├── admin-worker/
│   │   ├── src/
│   │   └── wrangler.toml (or wrangler.jsonc)
│   └── api-worker/
│       ├── src/
│       └── wrangler.toml (or wrangler.jsonc)
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── schema/
│   └── docs/
├── packages/
│   ├── shared-contracts/
│   ├── shared-validation/
│   └── localization/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture/
│   ├── audits/
│   ├── operations/
│   └── releases/
├── .github/
│   └── workflows/
├── README.md
└── SECURITY.md
```

### 10.4 API design rules

- Keep business rules in the API Worker, not duplicated in customer/admin UI code.
- Use versioned, documented JSON contracts and consistent error structures.
- Validate request shape, types, limits, and permissions server-side.
- Use idempotency for checkout, payment decisions, and other retry-prone mutations.
- Apply rate limiting to login, tracking, checkout, support submission, and sensitive admin endpoints.
- Use pagination and bounded search; do not return unbounded order/product collections.
- Add request IDs and structured logs that do not include passwords, tokens, private proof URLs, or unnecessary personal data.
- Keep customer responses separate from staff-only fields.

## 11. Data architecture and migration approach

### 11.1 Target entities

The final schema should clearly model:

- Store settings and service availability.
- Categories and products with localized text and images.
- Delivery zones and fee rules.
- Customer/order snapshots and order items.
- Orders and immutable order status events.
- Payments, payment proofs, and refunds/reconciliation records.
- Inventory movements and adjustments.
- Idempotency keys and rate-limit records.
- Staff users, sessions, roles, and permissions.
- Audit logs, notifications, and support cases.

Use foreign keys where supported and meaningful, unique constraints for business invariants, indexes for real query patterns, and migration records for every schema change.

### 11.2 Required reconciliation sequence

1. Export a recoverable backup of both `fryzar-production` and `fryzar-core` before any data-changing operation.
2. Store backup artifacts in an access-controlled location; do not commit raw customer data or SQL dumps containing personal information to GitHub.
3. Export and compare both schemas, indexes, unique constraints, and migration history.
4. Record non-sensitive row counts by table and identify which database contains the authoritative product, order, payment, and staff records.
5. Map legacy fields to the target model, including `payment_records` versus `payments` and `order_status_history` versus `order_status_events`.
6. Write tested, repeatable migration scripts with explicit source/target mapping and duplicate handling.
7. Run the migration against a non-production copy first; compare row counts, key aggregates, and selected integrity checks.
8. Verify rollback and restore procedures.
9. Select the canonical database in a signed-off decision record. `fryzar-core` may be selected if reconciliation confirms it is the proper target and the data is preserved.
10. Move one Worker at a time, verify health and end-to-end behavior, and retain the prior database binding as rollback until the release gate passes.
11. Never delete the old database merely because the new Worker is active. Keep it until the owner authorizes retirement after retention and backup checks.

## 12. Security, privacy, and reliability requirements

### 12.1 Secrets

- Store runtime secrets as Cloudflare Worker secrets or another approved secret manager.
- GitHub Actions receives only the minimum deployment credentials required; prefer short-lived/OIDC-based authentication where supported and verified.
- Never commit tokens, session secrets, bootstrap tokens, passwords, private keys, payment credentials, customer exports, or proof images.
- Rotate any credential that may have been exposed during recovery.
- Document secret names, purpose, owner, and rotation procedure, never secret values.

### 12.2 Access control and application security

- Enforce role/permission checks on the server for every admin route and mutation.
- Protect sessions with secure cookie flags, appropriate SameSite policy, expiry, rotation, and revocation.
- Validate origin/CORS allowlists for production; do not rely on wildcard CORS for credentialed admin traffic.
- Add CSRF protection where cookie-authenticated state-changing requests require it.
- Apply login throttling, tracking-token throttling, checkout abuse limits, and request-body limits.
- Escape untrusted text in HTML contexts and use safe query parameterization.
- Avoid leaking stack traces, D1 query details, secret names/values, or private records in customer-facing errors.

### 12.3 Privacy

- Collect only fulfilment-required customer information.
- Restrict order, phone, address, payment-proof, and support-case access by role.
- Define retention and deletion/anonymization rules appropriate for operational and legal obligations.
- Keep logs free of full addresses, phone numbers, payment tokens, and authentication material unless strictly required and appropriately protected.
- Publish privacy, delivery, refund/cancellation, and terms pages before public launch.

### 12.4 Resilience and observability

- Add structured Worker logs, request IDs, error monitoring, and operational dashboards.
- Track failed checkout, D1 errors, payment-review backlog, login failures, and deployment failures.
- Define backup cadence, retention, restore test cadence, and incident owner.
- Create rollback steps for Worker deployment, database migration, and domain routing.
- Do not claim backup readiness until a restore has actually been tested.

## 13. Localization, accessibility, and design requirements

- Urdu is a first-class language with correct RTL document direction and typography.
- English is fully supported with LTR layout.
- Do not mirror logos, phone-number strings, or controls incorrectly when switching direction.
- All prices use a consistent PKR display format; calculations remain numeric and server-side.
- Forms have labels, helpful validation, keyboard access, and screen-reader semantics.
- Maintain readable contrast, visible focus, accessible buttons, and clear loading/error feedback.
- Avoid layout shifts and horizontal scrolling on common mobile screens.
- Translation keys must be centralised; no scattered hard-coded UI strings.

## 14. Analytics and operational reporting

Track only events that help improve ordering and operations, with privacy-aware data minimization:

- Product/category views and searches.
- Add-to-cart and checkout start/completion.
- Checkout validation failures and idempotent retries.
- Order statuses and fulfilment duration.
- Payment method/status and verification time.
- Stock-outs, cancellations, and support resolution.

Reports must clearly distinguish placed orders, confirmed orders, delivered orders, collected COD, verified transfers, refunds, discounts, and net sales. Never label an unpaid/pending order as revenue.

## 15. Testing and acceptance strategy

### 15.1 Automated checks

- Static analysis, formatting, lint, and type checks appropriate to the recovered stack.
- Unit tests for money calculations, status transitions, validation, localization helpers, and permission checks.
- D1 integration tests for migrations, unique constraints, idempotency, and inventory operations.
- API tests for authentication, authorization, CORS, errors, rate limits, and payment workflows.
- E2E tests for customer ordering and admin fulfillment in both Urdu RTL and English LTR.
- Regression tests for the findings in section 3.5.

### 15.2 Mandatory end-to-end scenarios

1. Browse an active product and place a valid order.
2. Attempt checkout with an inactive product, changed price, unavailable delivery zone, and insufficient stock.
3. Repeat the exact checkout request with the same idempotency key and verify one order only.
4. Simulate concurrent checkouts against limited stock and verify no oversell.
5. Cancel an order and verify a single stock release.
6. Submit a manual-transfer order and verify the payment record exists before proof review.
7. Submit invalid/duplicate proof and verify it cannot mark an order paid.
8. Approve/reject a proof with the correct role and verify audit history.
9. Attempt restricted admin actions using a lower-privilege role and verify server-side denial.
10. Trigger failed login attempts and verify throttling.
11. Verify delivery fee changes in admin are reflected at checkout without a code deployment.
12. Verify a tracking token can view only its specific order and is rate-limited.
13. Verify customer, admin, and API Workers use the selected canonical D1 after migration.
14. Verify the production domain, TLS, canonical redirects, and all routes after DNS activation.
15. Verify rollback to the previous Worker version and restore of a database backup in a controlled environment.

### 15.3 Release gates

A release is not ready until all are true:

- Recovered deployed source is committed and reviewed in GitHub.
- The selected database and migration plan are documented and restore-tested.
- Customer and admin Workers use the approved architecture and database.
- No unresolved critical/high security issue remains.
- The production environment and CORS configuration are correct.
- Payment and stock scenarios pass end-to-end.
- Urdu/English mobile flows pass.
- Domain/TLS/routing is verified or the release is explicitly limited to the approved temporary hostname.
- Monitoring, backups, rollback, privacy/terms, and owner handover are documented.

## 16. GitHub and Cloudflare development workflow

### 16.1 Source-of-truth policy

GitHub is the only authoritative home for source code, schemas, migrations, tests, PRDs, prompts, decisions, and release records. Cloudflare is the deployed runtime and infrastructure environment. A deployed Worker version that is not represented by a reviewed GitHub commit is considered unreconciled operational state.

### 16.2 Development loop

1. Read current GitHub issues, project documentation, and active branch state.
2. Inspect Cloudflare resource configuration read-only before changing runtime state.
3. Create a feature/recovery branch in GitHub.
4. Recover or implement source in the repository and add tests.
5. Open a pull request with scope, risks, migration notes, and test evidence.
6. Run GitHub Actions validation and non-production deployment.
7. Run automated and manual smoke tests against the preview/staging URL.
8. Obtain owner approval for production-impacting changes.
9. Deploy the exact reviewed commit to Cloudflare.
10. Record Worker version/deployment IDs, D1 migration IDs, test outcomes, and rollback target in the release notes.

### 16.3 Session continuity and execution environment

Every work session starts by refreshing the GitHub repository, branch head, open issues, pull requests, and project records. Any automated build/test runner must obtain its inputs from GitHub and keep its execution workspace disposable. Canonical source, project decisions, task status, and evidence must never exist only outside the repository. The next session must resume from GitHub commits, issues, pull requests, and project records.

## 17. Ordered implementation roadmap

The roadmap is deliberately ordered so that no risky feature work begins before code and data are recoverable.

### Phase 0 — Project control and evidence (Tasks 1–10)

1. Freeze undocumented production changes while inventory is being captured.
2. Record GitHub repository metadata, default branch, existing files, and recent commits.
3. Inventory all Fryzar Cloudflare Workers and active versions.
4. Record Worker bindings, public configuration, secret names only, and routes without exposing secret values.
5. Inventory both Fryzar D1 databases and their schemas.
6. Inventory the `fryzar.com` zone, DNS records, Worker routes, and Workers subdomain state.
7. Confirm no Fryzar Pages project is currently configured.
8. Record R2/KV availability and current limitations.
9. Publish this infrastructure audit and decision log in GitHub.
10. Create a tracked issue list with status, risk, owner, and acceptance criteria.

### Phase 1 — Source and data recovery (Tasks 11–20)

11. Download the exact deployed source of `fryzar-app` from Cloudflare.
12. Download the exact deployed source of `fryzar-admin` from Cloudflare.
13. Download the exact deployed source of `fryzar-api` from Cloudflare.
14. Preserve module names, bindings, compatibility dates, flags, and deployment metadata.
15. Review recovered code for embedded credentials and remove/redact any values before committing.
16. Commit recovered source to dedicated GitHub recovery branches.
17. Add reproducible Worker configuration files based on observed non-secret settings.
18. Export and secure backups of both D1 databases.
19. Export schema and migration history from both databases.
20. Document source/runtime drift and the exact recovery commit for each Worker.

### Phase 2 — Database reconciliation and architecture decision (Tasks 21–30)

21. Produce a schema diff between `fryzar-production` and `fryzar-core`.
22. Capture non-sensitive row counts and key financial/inventory aggregates.
23. Identify authoritative product, category, order, payment, proof, staff, and settings records.
24. Map legacy payment and order-history names to the target domain model.
25. Decide the canonical database in a documented owner-approved ADR.
26. Build repeatable non-production migration scripts.
27. Test migration for duplicate keys, missing relationships, and historical-order preservation.
28. Validate indexes, foreign keys, and migration history.
29. Test restore and rollback from both backup exports.
30. Execute the controlled production migration only after approval and a passed rehearsal.

### Phase 3 — API and application integration (Tasks 31–40)

31. Define shared API contracts, validation, and error format.
32. Centralize checkout, pricing, inventory, payment, and order state logic in `fryzar-api`.
33. Remove duplicated business rules from customer/admin UI Workers.
34. Connect customer checkout to the central API.
35. Connect admin order operations to the central API.
36. Enforce idempotency on all retry-prone mutations.
37. Implement stock reservation/release invariants.
38. Implement order status transitions and immutable status history.
39. Add pagination, request limits, and structured request IDs.
40. Add integration tests proving all Workers use the approved canonical database.

### Phase 4 — Customer experience (Tasks 41–50)

41. Audit all customer screens and interactions in the recovered deployed code.
42. Establish the responsive design system and component library.
43. Complete Urdu and English localization dictionaries.
44. Validate RTL/LTR behavior across navigation, forms, numbers, and checkout.
45. Complete category and product browsing/search.
46. Complete product detail, availability, and image handling.
47. Complete cart calculations and stale-price/stock recovery.
48. Complete server-validated checkout and order confirmation.
49. Complete private order tracking and customer-safe status history.
50. Add clear empty, loading, offline, error, and success states.

### Phase 5 — Admin operations (Tasks 51–60)

51. Audit every admin route and staff permission.
52. Complete secure staff login, session expiry, revocation, and logout.
53. Implement login throttling and owner bootstrap closure/rotation.
54. Complete dashboard metrics with documented definitions.
55. Complete product and category administration.
56. Complete stock adjustment and inventory movement history.
57. Complete order management and valid status transitions.
58. Complete manual payment review, proof privacy, and audit trail.
59. Complete delivery zones, delivery fees, store availability, and contact settings.
60. Complete staff roles, support cases, notifications, and audit-log access.

### Phase 6 — Payments and commercial controls (Tasks 61–70)

61. Define the enabled payment methods with the store owner.
62. Ensure a payment record is created consistently for every applicable checkout.
63. Implement manual transfer proof submission and private storage/access control.
64. Implement reviewer approval/rejection with reason and actor.
65. Implement cash-on-delivery collection state if owner-approved.
66. Implement refund/reconciliation records and immutable history.
67. Reconcile order, payment, discount, delivery, refund, and sales totals.
68. Remove all hard-coded delivery-fee and payment information from UI code.
69. Add promotion/coupon rules only with explicit validation and price recalculation.
70. Document gateway integration prerequisites without inventing providers or credentials.

### Phase 7 — Security, domain, and operations (Tasks 71–80)

71. Replace wildcard CORS with environment-specific allowlists.
72. Set the production API environment and approved origin configuration.
73. Verify secret bindings and rotate any exposed or weak credential.
74. Complete role/permission, session, CSRF, input-validation, and rate-limit review.
75. Restrict logs and customer tracking responses to minimum required data.
76. Configure `fryzar.com` DNS and Worker custom-domain routing only after staging validation.
77. Configure TLS/canonical host/redirect behavior and validate DNS propagation.
78. Decide whether R2 is needed; enable it only with owner approval and a documented access design.
79. Configure alerts, error reporting, backup schedule, and recovery runbooks.
80. Verify all customer/admin/API entry points from an external browser and automated smoke tests.

### Phase 8 — QA, release, and handover (Tasks 81–90)

81. Run full unit, integration, migration, and E2E test suites.
82. Run customer checkout regression scenarios in Urdu RTL and English LTR.
83. Run payment and inventory concurrency/retry tests.
84. Run staff role-isolation and authentication abuse tests.
85. Run mobile viewport, accessibility, and performance checks.
86. Resolve every critical/high finding and document accepted residual risks.
87. Deploy the exact reviewed GitHub commit to production after owner approval.
88. Verify production flows and record Cloudflare deployment/version identifiers.
89. Publish privacy/terms/delivery/refund content and operator runbooks.
90. Produce final release report, support handover, and next-release backlog.

## 18. Launch checklist

- [ ] GitHub contains all recovered Worker source and reviewed migration files.
- [ ] Deployed source matches a tagged/reviewed commit.
- [ ] Both D1 databases have secure backups and successful restore evidence.
- [ ] Canonical database and cutover decision are documented.
- [ ] All Workers use the approved API/database topology.
- [ ] Checkout idempotency and stock restoration tests pass.
- [ ] Manual payment record/proof/review flow passes, or the method is disabled.
- [ ] CORS, APP_ENV, secrets, sessions, and role checks are production-safe.
- [ ] No hard-coded delivery fee, payment details, or unconfigured contact info remains.
- [ ] Product images resolve and have acceptable rights/alt text.
- [ ] Domain, DNS, TLS, and Worker routing are verified, or launch hostname is explicitly approved.
- [ ] Urdu RTL and English LTR customer/admin flows pass.
- [ ] Privacy, terms, delivery, cancellation/refund, and contact pages are published.
- [ ] Monitoring, backup cadence, rollback, and incident ownership are documented.
- [ ] Final customer, staff, and owner acceptance checks are recorded.

## 19. Project governance and reporting

Every work session must update a durable project record in GitHub. The report must state:

- **Completed:** exact files, features, tests, commits, and deployment IDs.
- **Remaining:** ordered tasks and what blocks each item.
- **Current risks:** production/data/security/deployment risks.
- **Evidence:** links to commits, PRs, CI runs, test reports, Cloudflare deployment references, and migration records.
- **Next action:** one concrete next task.

Do not use percentage-complete estimates unless they are tied to an explicitly weighted task list. Never label a feature "working", "fixed", or "production-ready" solely because code exists or a Worker upload succeeded. A claim requires a test result or observable evidence.

## 20. Final product definition

Fryzar Release 1 is complete when a customer can reliably order available products in Urdu or English, the server calculates and records the correct order/payment/inventory state, authorized staff can securely manage that order and the store catalogue, customer data is protected, the application runs on the approved Cloudflare deployment, and the entire deployed system is reproducible and traceable from GitHub. Everything else is secondary until this end-to-end promise is proven.
