# FRYZAR D1 Backup, Point-in-Time Recovery and Incident Runbook

**Status:** Design baseline; operator validation and a real recovery drill are still required.  
**Scope:** FRYZAR preview D1 and future production D1 only after separate authorization. This document does not authorize or perform any remote operation.

## 1. Purpose and recovery layers

FRYZAR must use two complementary recovery layers:

1. **Cloudflare D1 Time Travel** for short-horizon point-in-time recovery. Cloudflare documents restoration to any minute within the preceding 30 days.
2. **Independent logical SQL exports** stored outside the D1 database (recommended destination: a dedicated, private R2 bucket) for portability, longer retention, and recovery when a point-in-time restore is unsuitable.

A local Wrangler persistence-directory copy is only a local test fixture. It is not a Cloudflare-managed backup, not an R2 export, and not proof that a remote database can be restored.

Cloudflare's published Workflow example demonstrates exporting D1 through the D1 REST API and saving the SQL dump to R2. It is an implementation example, not a backup service automatically enabled for this project. FRYZAR has not yet implemented or verified this scheduled export pipeline.

## 2. Cloudflare D1 recovery facts and limits

- D1 Time Travel provides point-in-time restore within the preceding 30 days, with minute-level time selection.
- Time Travel is a managed recovery feature; it is distinct from a separately retained SQL export.
- A restore is a high-impact operation against the selected database. It can discard valid writes made after the selected recovery point. Never use it as an exploratory diagnostic.
- Database deletion recovery is a separate operation from Time Travel. Cloudflare's 23 October 2026 changelog states that D1 undelete requests are limited to databases deleted within the last 7 days. Treat accidental deletion as an urgent Cloudflare support/API escalation, not as a 30-day Time Travel case.
- The local D1 snapshot/restore test in this repository verifies only a copied local Wrangler persistence directory. It does not test remote Time Travel, remote export, R2 storage, credentials, or restore permissions.
- Before executing any recovery, the operator must confirm the exact current Cloudflare CLI/API procedure, account/database identifiers, plan/limits, and target semantics against the linked Cloudflare documentation. Do not improvise a command or endpoint from memory.

## 3. FRYZAR data classification and recovery priority

| Data | Recovery priority | Notes |
|---|---|---|
| Orders, order items, status history | Critical | Preserve customer commitments and operational history |
| Payments, COD collections, refunds, ledger/audit records | Critical | Reconcile against external provider/bank records after restore |
| Inventory and inventory movements | Critical | Reconcile physical stock before reopening ordering |
| Customers and private tracking-token hashes | High | Protect personal data; do not export to public storage |
| Products, categories, modifiers, delivery zones, settings | High | Validate catalogue and store readiness |
| Sessions and ephemeral operational state | Lower | Revoke sessions after recovery if integrity is uncertain |
| Migration ledger and schema metadata | Critical | Confirm schema matches the Worker version before traffic resumes |

Never restore a production database into preview or preview data into production. Never copy personal or financial records into developer fixtures.

## 4. Proposed service objectives (targets, not guarantees)

These are FRYZAR planning targets and must be approved by the owner before they become contractual or operational commitments.

| Recovery path | Proposed RPO | Proposed RTO | Qualification |
|---|---:|---:|---|
| D1 Time Travel, within 30-day window | Up to 1 minute | 60 minutes | Target only; depends on incident scope, operator access and validation |
| Independent daily SQL export to private R2 | Up to 24 hours | 4 hours | Not achieved until scheduled exports and restore drills exist |
| Accidental database deletion | No guaranteed RPO | Escalate immediately | Undelete window is currently documented as 7 days; recovery is not guaranteed |

RPO means the maximum tolerable amount of data loss measured in time. RTO means the target time to restore an acceptable service. Neither value is a Cloudflare SLA or a verified FRYZAR measurement.

For orders and financial records, a daily export alone is not sufficient protection against losing a full day of activity. Use Time Travel for short-horizon recovery and independently retained exports as a second layer. After any restore, reconcile orders/payments against trusted external records before reopening checkout.

## 5. Backup/export policy to implement

The following is the recommended policy. It is not yet implemented or verified:

- Schedule an automated D1 SQL export at least daily.
- Store exports in a dedicated private R2 bucket with encryption/access controls and no public read binding.
- Use an isolated, least-privilege token for the backup workflow. Do not reuse broad deployment credentials.
- Use unique object keys containing environment, database identity, UTC timestamp and export identifier. Do not include customer data in object names.
- Verify export completion, non-zero size, checksum, upload success and metadata before marking a backup successful.
- Alert on failed, late, empty or unverifiable exports.
- Retention proposal: daily exports for 35 days and monthly checkpoints for 12 months, subject to storage cost, privacy obligations and owner approval.
- Keep preview and production exports in separate buckets or strongly isolated prefixes and permissions.
- Never delete the last known-good export during rotation. Test retention logic on synthetic objects first.
- Record backup run ID, environment, database ID, timestamp, checksum, byte size, schema/migration version and result. Do not log credentials or SQL contents.

Cloudflare's published D1-to-R2 Workflow example is a useful implementation reference. It does not by itself supply retention policy, alerting, access governance, restore testing, or FRYZAR-specific validation.

## 6. Recovery decision tree

1. **Worker/API incident, database data appears intact:** stop risky writes if necessary; inspect Worker deployment/configuration and D1 health. Prefer fixing the Worker/configuration rather than restoring data.
2. **Suspected bad writes or corruption within 30 days:** declare an incident, pause customer ordering and all admin write operations through an approved operational control, capture incident time and evidence, then assess a Time Travel restore point.
3. **Restore point selected:** obtain owner approval, preserve the current state/export if supported and safe, confirm exact target database identity, choose a recovery point before the damaging event, and execute only under the approved change window.
4. **Incident older than Time Travel window or a separate portable copy is required:** identify the latest verified SQL export, restore into a separate isolated recovery database first, validate it, and only then prepare a separately approved cutover plan.
5. **Database deleted:** escalate immediately. The documented undelete window is seven days. Do not create a replacement database and point production traffic at it without an approved recovery/cutover plan.
6. **After any recovery:** keep ordering closed until integrity, schema, financial and operational checks pass.

## 7. Mandatory operator checklist

### Before recovery
- [ ] Incident declared; scope, start time, suspected cause and impact recorded.
- [ ] Correct environment explicitly identified: preview or production.
- [ ] Account ID, database name and database UUID independently checked against the approved inventory.
- [ ] Owner approval recorded for the exact operation and target.
- [ ] Customer checkout and admin write paths are safely paused using an approved mechanism.
- [ ] Current state and available exports are preserved where supported and safe.
- [ ] Recovery point is before the first known bad write and its timezone is UTC.
- [ ] Cloudflare's current restore procedure, permissions and expected side effects have been reviewed.
- [ ] A rollback/abort decision and incident lead are identified.

### After recovery, before reopening
- [ ] Database identity and environment re-confirmed.
- [ ] All expected migrations and migration ledger entries verified.
- [ ] Foreign-key check returns zero violations.
- [ ] Critical table counts and recent order/payment/inventory samples reviewed against pre-incident evidence.
- [ ] Order totals, payment states, COD collections, refunds and ledger invariants reconciled.
- [ ] Inventory balances and movements reconciled against operational stock.
- [ ] Admin access reviewed; revoke sessions if exposure or inconsistency is suspected.
- [ ] Worker compatibility with restored schema verified in an isolated test first.
- [ ] Health, catalogue, delivery settings, checkout-closed behavior and admin authorization smoke tests pass.
- [ ] Owner approves reopening; incident log records actual RPO/RTO and any unreconciled records.

## 8. Restore drill requirements

Before this runbook can be marked operationally verified:

1. Implement the independent export pipeline and private storage policy.
2. Run a scheduled synthetic-data export for preview only.
3. Restore that export into a separate disposable recovery database, never over the live preview database.
4. Validate checksum, schema/migration ledger, foreign keys, critical synthetic records and Worker compatibility.
5. Measure elapsed recovery time and record observed RPO/RTO.
6. Test alerting for failed export and failed validation.
7. Obtain explicit authorization before any remote preview database creation, export, import, restore, or mutation. No production drill without separate explicit production authorization.
8. Repeat after material schema/backup pipeline changes and at least quarterly once operational.

## 9. Current FRYZAR implementation status

- Local disposable D1 snapshot/restore rehearsal: implemented and previously passed CI on commit `d8aa96f0a5404267e9c4950537e61ab94ef4b4c6`.
- Remote D1 Time Travel recovery: not exercised by FRYZAR.
- Scheduled D1 SQL export to R2: not implemented.
- Backup retention and failure alerting: not implemented.
- Remote restore drill: not performed.
- RPO/RTO values: proposed targets only, not measured or approved.
- Production recovery readiness: not established.

## 10. References

- Cloudflare D1 overview and Time Travel summary: https://developers.cloudflare.com/d1/
- Cloudflare D1 Time Travel documentation: https://developers.cloudflare.com/d1/reference/time-travel/
- Cloudflare example: export and save D1 database to R2 using Workflows: https://developers.cloudflare.com/workflows/examples/backup-d1/
- Cloudflare D1 undelete window update (23 October 2026): https://developers.cloudflare.com/changelog/post/2026-10-23-undelete-seven-day-window/
- FRYZAR local rehearsal: `tests/backup-restore.integration.cjs`
- FRYZAR migration reference: `docs/MIGRATIONS.md`

---

**Safety notice:** This document is an operational design. It does not grant permission to run remote D1 commands, create R2 resources, change credentials, restore a database, deploy Workers, or alter production.
