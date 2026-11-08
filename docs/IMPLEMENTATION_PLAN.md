# FRYZAR implementation plan

## Principles
- Fresh source and new D1 database. Preserve legacy resources until replacement has passed release gates.
- Free-first. No paid plans, services, storage or APIs without approval.
- Keep store closed, payment transfer disabled, and production routes untouched until verified.
- Every feature must have acceptance criteria and evidence. A source file is not proof of a working feature.

## Sequence

### Stage 1: Foundation
- [x] Private repository and development branch
- [x] Fresh D1 database and versioned core migration
- [x] API Worker foundation
- [x] Checkout/inventory integrity migration
- [x] Initial API CI and tests
- [x] Customer storefront source and first production build
- [x] Delivery-zone public API source
- [x] Atomic first-owner claim migration
- [ ] Validate latest expanded API/admin CI
- [ ] Deploy the current API source to isolated Worker
- [ ] Verify real HTTP responses and real D1 integration

### Stage 2: Admin operations
- [x] Owner bootstrap/login/logout/session source
- [x] Role-aware order list/detail source
- [x] Cancellation stock-restoration source
- [x] Admin portal authentication/overview/Orders source
- [ ] Verify session cookie and first-owner bootstrap on a live Worker
- [ ] Staff CRUD, invitations, role changes and account deactivation
- [ ] Catalog/category CRUD, price and availability administration
- [ ] Inventory adjustment with reason and audit
- [ ] Delivery-zone CRUD
- [ ] Store settings and launch controls
- [ ] Payment-review queue and COD collection

### Stage 3: Customer ordering
- [x] Storefront layout, bilingual navigation and category/product loading source
- [x] Cart and COD checkout form source
- [ ] Populate genuine catalogue, images and delivery areas
- [ ] Verify guest checkout end-to-end with real D1
- [ ] Add customer tracking lookup that accepts the private token safely
- [ ] Add cancellation/support/customer contact policy as business decisions are supplied
- [ ] Validate Urdu RTL and English LTR across responsive layouts

### Stage 4: Payments and storage
- [x] COD unpaid payment record creation source
- [ ] COD delivered/collected state transitions
- [ ] Manual-transfer payment state machine
- [ ] Private proof upload and validation
- [ ] Restricted proof access for customer/authorized finance staff
- [ ] Verify amount/reference and record reviewer/rejection
- [ ] Check R2 eligibility and exact costs before activation
- [ ] Keep transfer disabled until all tests pass

### Stage 5: Android
- [ ] Native Kotlin + Jetpack Compose project
- [ ] Same API contract as website
- [ ] Product browsing, cart, checkout and tracking
- [ ] Network/offline/error handling
- [ ] App privacy and security review
- [ ] Build APK and verify on emulator/device

### Stage 6: Release
- [ ] Complete automated, D1 integration, browser E2E and Android tests
- [ ] Production origins, DNS, TLS, routes and cookies
- [ ] Backup/restore and rollback rehearsal
- [ ] Owner-configured genuine business settings
- [ ] Release readiness review and final evidence report
