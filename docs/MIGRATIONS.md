# FRYZAR D1 migration catalog and safety notes

**Source branch:** `foundation/fresh-build`  
**Migration set:** `apps/api/migrations/0001_core.sql` through `0005_operational_retention.sql`  
**Verification:** `npm run test:integration:migrations` against a disposable local Wrangler D1 database.

This document describes the checked-in migration files. It is not authorization to apply them to any remote database. The preview deployment workflow remains separately controlled and production is out of scope.

## Migration execution model

- Wrangler reads the ordered SQL files from `apps/api/migrations` and records applied filenames in its `d1_migrations` ledger.
- Apply migrations only to a newly created disposable local D1 database for development and CI, or to a specifically reviewed/authorized target through its dedicated procedure.
- Never manually delete or edit the migration ledger to force a migration.
- Do not re-run non-idempotent SQL files manually. Wrangler's migration ledger is the replay guard.
- Current CI applies the full sequence to isolated local D1 fixtures and runs schema, index, trigger, migration-order and foreign-key assertions.
- The checked-in API Worker config points at preview D1. A successful local test or Wrangler dry-run does not apply remote migrations or establish that the latest source is deployed.

## Migration catalog

| File | Purpose and expected changes | Preconditions and compatibility | Rollback limitations |
|---|---|---|---|
| `0001_core.sql` | Creates the core store schema: settings, bilingual categories/products, image metadata, delivery zones, staff/users/sessions, orders/items/status events, payments/proofs, inventory movements, idempotency, auth/rate-limit state, audit logs, notifications and support cases. Adds query indexes and a trigger preventing negative product stock. Seeds safe setup defaults, including closed store and disabled manual transfer. | Intended for an empty database. Creates the base objects required by every later migration and the current API. Existing legacy production schemas are not compatible by assumption. | No down migration is supplied. Dropping the created tables destroys business, financial, staff and audit data. Rebuild only a disposable database or use a separately reviewed data-preserving migration plan. |
| `0002_checkout_integrity.sql` | Adds one-payment-per-order uniqueness, a partial unique inventory movement index to prevent duplicate order reservation/cancellation movements, and a trigger validating product existence, availability and stock before order-item insertion. | Requires the core tables from 0001. Existing duplicate payment or inventory movement rows can make unique-index creation fail. Validate duplicates before applying to any database with data. | Removing the indexes/triggers may weaken checkout integrity. Do not use a rollback to bypass duplicate data; reconcile data and retain the constraints. |
| `0003_admin_bootstrap.sql` | Creates `bootstrap_claims` with a constrained single `first_owner` claim key for one-time owner setup. | Requires the staff/bootstrap API introduced with the core schema. Does not create an owner or invoke bootstrap. | Dropping the claim table can permit a second bootstrap attempt and is security-sensitive. Never roll it back on a live environment. |
| `0004_inventory_adjustments.sql` | Creates an immutable-style inventory adjustment record with product, actor, reason, quantity delta, before/after stock and note. Adds product/time lookup and unique adjustment-movement indexes. | Requires products, staff users and inventory movements. Existing stock must be non-negative; actor references must be valid. | Deleting adjustment history damages stock reconciliation and auditability. No destructive rollback is approved. |
| `0005_operational_retention.sql` | Adds indexes on idempotency expiry and login-attempt timestamps to support bounded scheduled cleanup. It does not delete rows or prune financial/audit history. | Requires `idempotency_keys.expires_at` and `auth_login_attempts.attempted_at` from 0001. Safe as additive indexes when the required tables/columns exist. | Dropping indexes is technically possible but removes query support for bounded cleanup. No rollback is needed for normal operation; preserve the migration ledger. |

## Verification queries

Run these only against the intended **local disposable D1** unless a separately approved read-only inspection is in scope.

```sql
-- Ordered migration ledger
SELECT name FROM d1_migrations ORDER BY name;

-- Expected application tables (21)
SELECT name FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;

-- Foreign-key violations (expected: zero rows)
PRAGMA foreign_key_check;

-- Expected integrity triggers
SELECT name, sql FROM sqlite_master
WHERE type = 'trigger'
ORDER BY name;

-- All indexes
SELECT name, tbl_name, sql FROM sqlite_master
WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
ORDER BY name;
```

## CI migration verification

`tests/migrations.integration.cjs` creates a temporary local Wrangler D1 database through the guarded helper. It verifies:

1. Exactly five expected migration filenames in order.
2. All 21 expected application tables exist.
3. All 21 expected named indexes exist.
4. Both integrity triggers exist.
5. `pragma_foreign_key_check` reports zero violations.
6. A second Wrangler migration apply is a no-op and leaves the migration count unchanged.
7. The temporary database and local state are removed after the test.

The test never uses `--remote`; the helper rejects Wrangler commands without `--local` and clears Cloudflare credentials from the child process environment.

## Backup and restore status

The 1 November backup record documents SQL exports of two legacy production databases and SQLite replay checks. That was not a managed Cloudflare D1 restore drill and it did not exercise this current five-migration foundation as a backup/restore cycle.

A repeatable current-schema rehearsal remains open. It must use a disposable local D1 database, preserve the original export, verify SHA-256, restore into a separate empty target, compare schema and row counts, and run foreign-key checks. It must never overwrite preview or production to demonstrate rollback.

## Compatibility and release rule

The current preview deployment candidate is an older commit than the development branch. Do not infer that migration 0005 or any later branch change is present in remote preview. Before a separately authorized preview deployment, review migration state and data compatibility, retain a recoverable backup, and confirm the exact preview D1 UUID. No production migration or cutover is authorized.
