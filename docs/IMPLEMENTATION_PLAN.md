# FRYZAR implementation plan

## Stage 0: Fresh foundation
- Establish the clean monorepo and project documentation.
- Create a separate D1 database.
- Add the initial schema migration.
- Implement initial API health, catalog, and public settings reads.
- Type-check, test, and deploy an isolated Worker.

## Stage 1: API and data integrity
- Product/category administration APIs.
- Server-side checkout validation and trusted totals.
- Mandatory idempotency with payload-hash verification.
- Atomic order, order-item, stock-reservation, and inventory writes.
- Safe cancellation and exactly-once stock restoration.
- Hashed tracking tokens and explicit order-state transitions.

## Stage 2: Staff identity and authorization
- One-time owner bootstrap with no default password.
- Password hashing, session rotation, expiry, revocation, logout.
- Server-side role authorization on every sensitive endpoint.
- Login abuse throttling, CSRF/origin controls, and audit logging.
- Staff creation, deactivation, role management, and password reset.

## Stage 3: Customer website
- Responsive Urdu/English storefront.
- Home, categories, search, product details, cart, guest checkout, confirmation, tracking, and support.
- Delivery-zone selection and server-authoritative fees.
- Accessible forms and robust empty/loading/error/offline states.

## Stage 4: Admin portal
- Dashboard, products, categories, inventory, orders, delivery zones, store settings, support, payment review, and audit history.
- Role-aware navigation with API-enforced permissions.

## Stage 5: Payments and private uploads
- COD collection workflow.
- Manual-transfer payment record creation and state transitions.
- Verify free-tier and account requirements before activating private object storage.
- Upload validation, private reads, reviewer workflow, rejection reasons, and controlled resubmission.
- Keep manual transfer disabled until end-to-end acceptance criteria pass.
- Evaluate real gateways only after fees, local eligibility, and merchant requirements are verified.

## Stage 6: Android
- Native Kotlin/Compose customer app using the stable API.
- Catalog, cart, guest checkout, tracking, language, and error/retry states.
- Build and test an installable APK.

## Stage 7: Release
- Configure verified hostname routes, TLS, CORS, and cookies.
- Configure production-only secrets.
- Run staging end-to-end tests.
- Verify backup and rollback.
- Complete every release gate before launch.
