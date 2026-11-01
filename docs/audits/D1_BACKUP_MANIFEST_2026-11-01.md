# D1 backup and restore record — 1 November 2026

Both exports completed successfully during the owner-approved maintenance window. The SQL files are stored locally in a restricted-access folder under the task workspace; the folder ACL grants Full Control only to the current Windows user and SYSTEM. The raw backups are not in GitHub.

| Database | Database UUID | Export file | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| fryzar-production | 880b9681-4252-4db0-be44-b60c4edbdc15 | fryzar-production.sql | 9,962 | 57AC127E508FC8DC89233D6CECC5D299C52A317A933351F52EE32BE43DA32CF3 |
| fryzar-core | 098238a6-1bda-4735-8f21-d925c7fe32de | fryzar-core.sql | 15,389 | EB540E80CBDADFCA51ABD5B32D40878DC899E27F5D91FEEEC18A9B965E37A7D2 |

## Restore verification

Each dump was executed with SQLite against a separate in-memory database. Both restored without SQL errors.

- fryzar-production: 15 application tables; products 4, categories 3, orders 0, payment_records 0, staff_users 0.
- fryzar-core: 22 application tables; products 0, categories 0, orders 0, payments 0, staff_users 0.

The row counts match the pre-export read-only inventory. A read-only `SELECT 1` probe succeeded against both live D1 databases after export completion. No database content was modified.

This confirms SQL replay against the installed local SQLite runtime. It is not a D1-specific managed restore drill, and no database was restored over production.
