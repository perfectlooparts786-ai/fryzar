# FRYZAR Admin Control Center — 27-Module & 7-Role RBAC Verification

**Last verified:** 7 November 2026  
**Branch:** `feature/fryzar-preview-acceptance`  
**Live Preview URL:** `https://fryzar-admin-preview.perfectlooparts786.workers.dev` (Version `40f93681-a678-4867-a920-92717dd3b560`)

---

## 1. Role-Aware Navigation & API Authorization Matrix

`apps/admin/src/App.tsx` filters navigation items per authenticated staff role (`allowedRoles` on `NAV`) and selects role-appropriate landing views (`kitchen` -> `kitchen`, `rider` -> `riders`, `support` -> `support`, others -> `overview`) so staff never trigger background `403` noise, while every `/api/v1/admin/*` and `/api/v1/rider/*` endpoint enforces strict server-side RBAC:

| Role | Default Landing | Accessible Admin Modules | Key Server-Side Boundaries Verified |
|---|---|---|---|
| `owner` | `overview` | **All 27 modules** (including Setup Readiness Checklist, Advertising & Monetization, SEO, System Health) | Exclusive access to `/api/v1/admin/advertising/*`, `/api/v1/admin/seo/*`, `/api/v1/admin/system-health`, and owner-tier staff governance |
| `manager` | `overview` | 24 operational modules (all except owner-only Advertising, SEO, System Health) | Cannot escalate to `owner`, cannot modify another `manager`/`owner`, cannot toggle `launch_ready` or `manual_transfer_enabled` via general settings |
| `operator` | `overview` | Overview, Orders, Kitchen, Products (read), Categories (read), Delivery Zones (read), Riders, Support, Settings (read), Notifications | Denied manual stock adjustments, supplier/PO writes, staff directory, customer directory, and payment records |
| `kitchen` | `kitchen` | Kitchen Display (KDS), Orders (redacted), Ingredients (read), Recipes/BOM (read), Wastage Logs (create/read), Notifications | Customer phone & street address stripped in SQL/projection; denied order cancellation, supplier writes, and delivery dispatch updates |
| `rider` | `riders` | Riders & Dispatch (`RiderSelfAssignment` queue), Delivery Zones (read), Notifications | Horizontal isolation enforced: can only read/update deliveries assigned to `riders.staff_user_id === user.id`; zero `403` console errors |
| `finance` | `overview` | Overview, Payments & COD, Refunds & Reversals, Financial Ledger & Reconciliation, Notifications | Customer phone & address stripped from payment projections; denied order queue and inventory mutations |
| `support` | `support` | Overview, Orders (lookup), Support Inbox (threaded replies & status updates), Notifications | Scoped to customer care triage; denied catalogue, stock, finance, and staff mutations |

---

## 2. Module-by-Module Verification Ledger (27 / 27 Complete, Zero Placeholders)

| # | Module Key | UI Component | Backing API Endpoints | Persistence Tables | Phase 2 Acceptance Status |
|---|---|---|---|---|---|
| 1 | `overview` | `Overview` + `OwnerSetupReadinessCard` (`App.tsx`) | `GET /api/v1/admin/dashboard`, `/products`, `/delivery-zones`, `/storefront-config`, `/admin/audit-logs` | `orders`, `products`, `delivery_zones`, `store_settings`, `audit_logs` | **PASS** — Displays KPIs + live 6-gate Owner Setup & Cutover Readiness Checklist (`data-testid="owner-setup-readiness"`) |
| 2 | `orders` | `Orders` + `PrintableReceiptModal` (`App.tsx`) | `GET /api/v1/admin/orders`, `PATCH .../status`, `POST .../cancel` | `orders`, `order_items`, `order_status_events`, `inventory_movements` | **PASS** — Atomic cancel restock + thermal/A4 printable PKR receipt |
| 3 | `kitchen` | `KitchenQueue` (`App.tsx`) | `GET /api/v1/admin/orders`, `PATCH /api/v1/admin/orders/:id/status` | `orders`, `order_status_events` | **PASS** — Privacy-redacted prep cards (`confirmed -> preparing -> ready`) |
| 4 | `products` | `Products` (`App.tsx`) | `GET/POST/PATCH/DELETE /api/v1/admin/products` | `products`, `inventory_adjustments`, `inventory_movements` | **PASS** — Bilingual CRUD + `409` archive-over-delete guard when history exists |
| 5 | `categories` | `Categories` (`App.tsx`) | `GET/POST/PATCH /api/v1/admin/categories` | `categories`, `audit_logs` | **PASS** — Bilingual EN/UR category CRUD and sort order |
| 6 | `gallery` | `ProductGalleryModule` (`ExtendedModules.tsx`) | `GET/POST /api/v1/admin/products/:id/images`, `DELETE .../images/:imageId` | `product_images` | **PASS** — Multi-image HTTPS URL gallery, primary toggle, bilingual alt text |
| 7 | `variants` | `VariantsAndModifiersModule` (`ExtendedModules.tsx`) | `POST/PATCH/DELETE /api/v1/admin/products/:id/variants`, `/modifier-groups`, `/options` | `product_variants`, `modifier_groups`, `modifier_options`, `product_modifier_groups` | **PASS** — Size pricing & min/max/required modifier groups |
| 8 | `inventory` | `Inventory` (`App.tsx`) | `POST /api/v1/admin/inventory/adjustments`, `GET .../movements` | `products`, `inventory_adjustments`, `inventory_movements`, `idempotency_keys` | **PASS** — Idempotent adjustments, concurrent CAS guard, negative-stock prevention |
| 9 | `ingredients` | `IngredientsModule` (`ExtendedModules.tsx`) | `GET/POST/PATCH /api/v1/admin/ingredients` | `ingredients` | **PASS** — Raw stock units, low-stock reorder threshold, unit cost paisa |
| 10 | `recipes` | `RecipesModule` (`ExtendedModules.tsx`) | `GET /api/v1/admin/recipes/:productId`, `POST /api/v1/admin/recipes` | `recipes`, `recipe_ingredients`, `recipe_consumptions` | **PASS** — Finished product to raw ingredient BOM mapping |
| 11 | `suppliers` | `SuppliersModule` (`ExtendedModules.tsx`) | `GET/POST /api/v1/admin/suppliers` | `suppliers` | **PASS** — Supplier directory (`owner`/`manager` write; `kitchen` denied `403`) |
| 12 | `purchase-orders` | `PurchaseOrdersModule` (`ExtendedModules.tsx`) | `GET/POST /api/v1/admin/purchase-orders`, `POST .../:id/receive` | `purchase_orders`, `purchase_order_items`, `ingredients`, `financial_ledger` | **PASS** — Atomic PO receiving increments ingredient stock & posts expense ledger |
| 13 | `wastage` | `WastageModule` (`ExtendedModules.tsx`) | `GET/POST /api/v1/admin/wastage` | `wastage_records`, `ingredients`, `products`, `inventory_movements`, `financial_ledger`, `audit_logs` | **PASS** — Aligned to DB `CHECK` (`expired`, `spilled`, `damaged`, `prep_loss`, `other`), accessible to `kitchen`, deducts stock & logs audit |
| 14 | `zones` | `Zones` (`App.tsx`) | `GET/POST/PATCH /api/v1/admin/delivery-zones` | `delivery_zones`, `audit_logs` | **PASS** — Delivery fees, minimum order paisa, ETAs, soft deactivation |
| 15 | `riders` | `RidersModule` (`ExtendedModules.tsx`) | `GET/POST/PATCH /api/v1/admin/riders`, `/deliveries`, `/api/v1/rider/assignments` | `riders`, `delivery_assignments`, `orders` | **PASS** — Manager dispatch board + horizontally isolated Rider self-service view |
| 16 | `customers` | `CustomersModule` (`ExtendedModules.tsx`) | `GET /api/v1/admin/customers` | Derived from `orders` (`GROUP BY customer_phone`) | **PASS** — Order count & lifetime PKR spend (`owner`/`manager` only) |
| 17 | `payments` | `Payments` (`App.tsx`) | `GET /api/v1/admin/payments`, `POST .../cod-collection` | `payments`, `orders`, `financial_ledger`, `idempotency_keys`, `audit_logs` | **PASS** — Delivered-only exact-amount idempotent COD collection |
| 18 | `refunds` | `RefundsModule` (`ExtendedModules.tsx`) | `GET/POST /api/v1/admin/refunds` | `refunds`, `orders`, `payments`, `financial_ledger`, `audit_logs` | **PASS** — Cumulative refund cap (`<= order.total_paisa`), partial/full status reconciliation |
| 19 | `ledger` | `FinancialLedgerModule` (`ExtendedModules.tsx`) | `GET/POST /api/v1/admin/finance/ledger`, `GET .../summary`, `GET .../reconciliation` | `financial_ledger`, `orders`, `payments`, `refunds`, `wastage_records` | **PASS** — Immutable paisa ledger + daily/monthly reconciliation |
| 20 | `coupons` | `CouponsModule` (`ExtendedModules.tsx`) | `GET/POST/PATCH /api/v1/admin/coupons` | `coupons`, `coupon_redemptions` | **PASS** — Fixed/percent discounts, min order, max cap, usage limits, expiry |
| 21 | `editorial` | `EditorialModule` (`ExtendedModules.tsx`) | `GET/POST/PATCH/DELETE /api/v1/admin/editorial` | `editorial_posts`, `audit_logs` | **PASS** — Bilingual EN/UR food guides CMS (`draft` / `published`) |
| 22 | `advertising` | `AdvertisingModule` (`ExtendedModules.tsx`) | `GET /api/v1/admin/advertising/overview`, `PATCH .../config`, `PUT .../zones/:id`, `POST .../kill-switch`, `POST .../reports` | `monetization_settings`, `ad_zones`, `ad_performance_reports`, `ad_events`, `audit_logs` | **PASS** — Reconciled real API contract, canonical `placement_slot` selector, 1-click Emergency Kill Switch |
| 23 | `seo` | `SeoModule` (`ExtendedModules.tsx`) | `GET/PUT /api/v1/admin/seo`, `/sitemap.xml`, `/robots.txt` | `store_settings`, `editorial_posts`, `products`, `categories` | **PASS** — Canonical domain, indexing controls, live sitemap/robots inspection |
| 24 | `support` | `SupportModule` (`ExtendedModules.tsx`) | `GET /api/v1/admin/support`, `GET/POST .../:id/messages`, `PATCH .../:id/status` | `support_cases`, `support_messages` | **PASS** — Threaded ticket responses & status lifecycle |
| 25 | `settings` | `Settings` (`App.tsx`) | `GET/PATCH /api/v1/admin/settings` | `store_settings`, `audit_logs` | **PASS** — Store name EN/UR, WhatsApp E.164 validation, COD toggle, hours |
| 26 | `staff` | `Staff` + `AuditLogs` (`App.tsx`) | `GET/POST/PATCH /api/v1/admin/staff`, `POST .../:id/password`, `GET /api/v1/admin/audit-logs`, `/notifications` | `staff_users`, `staff_sessions`, `audit_logs`, `notifications` | **PASS** — 7-role RBAC, session revocation on role/password/deactivation, audit search |
| 27 | `health` | `SystemHealthModule` (`ExtendedModules.tsx`) | `GET /api/v1/admin/system-health` | `d1_migrations`, `system_events` | **PASS** — Reports `0009_platform_completion.sql`, table counts, secret booleans, Free-tier limits |
