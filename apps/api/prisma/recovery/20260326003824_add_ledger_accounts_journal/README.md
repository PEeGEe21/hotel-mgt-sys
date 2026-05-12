# Recovery: `20260326003824_add_ledger_accounts_journal`

## Migration

- migration name: `20260326003824_add_ledger_accounts_journal`
- primary tables:
  - `Account`
  - `JournalEntry`
  - `JournalLine`

## What Changed

This migration introduced the ledger foundation:

- chart of accounts per hotel
- journal entries
- journal lines
- finance-oriented indexes and foreign keys

These tables support accounting records for invoice issuance, payment settlement, and other finance-linked postings.

## Risk Summary

- migration type: additive
- primary risk:
  - runtime/schema mismatch if the application expects ledger tables and they are missing
  - loss of accounting history if the schema is rolled back without preserving data
- app rollback alone is preferred if:
  - the issue is application behavior rather than schema integrity
  - the prior application version can safely ignore the added tables
- schema rollback is only needed if:
  - the migration itself must be reversed
  - the deployed application stack must return to a pre-ledger schema shape

## Trigger Conditions

Use this recovery artifact if one or more of these are true:

- finance, invoice, or payment flows fail due to ledger schema mismatch
- deploy or migration failure is directly tied to `Account`, `JournalEntry`, or `JournalLine`
- rollback must return the database to a pre-ledger state for application compatibility

## Preconditions

Before executing rollback SQL:

1. stop or pause the failing rollout
2. decide whether application rollback alone is enough
3. confirm a recent database backup exists
4. confirm no newer migration depends on these tables
5. confirm no critical recovery workflow needs the live ledger tables during rollback
6. review the SQL in `rollback.sql` before execution

## Execution Order

1. roll the application back first if possible
2. execute [rollback.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260326003824_add_ledger_accounts_journal/rollback.sql)
3. execute [verify.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260326003824_add_ledger_accounts_journal/verify.sql)
4. re-check `GET /api/v1/health/ready`
5. smoke-test the older application version to confirm it no longer expects ledger tables

## Recovery Notes

- this rollback preserves ledger data into backup tables before removing the live schema
- backup tables are intended for audit/recovery use and are not part of the live application model
- because `JournalLine` depends on `JournalEntry` and `Account`, all three tables are backed up before any drop occurs
- if newer finance migrations depend on ledger data, do not run this rollback until dependency impact is reviewed

## Follow-up

If this script is used in a real incident:

- document the release version and commit SHA involved
- record approximate row counts preserved in backup tables
- decide whether the backup tables need to be restored or transformed before reintroducing ledger features later
