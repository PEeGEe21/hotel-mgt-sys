# Recovery: `20260506120000_add_realtime_diagnostics_tables`

## Migration

- migration name: `20260506120000_add_realtime_diagnostics_tables`
- primary tables:
  - `RealtimeModuleHealth`
  - `RealtimeEventLog`

## What Changed

This migration introduced persisted realtime diagnostics storage:

- module health snapshots per hotel
- realtime event history per hotel
- persisted realtime diagnostics settings stored as event-log payloads

These tables power:

- `/realtime/diagnostics`
- `/realtime/settings`
- admin realtime history and module health UI

## Risk Summary

- migration type: additive
- primary risk:
  - runtime/schema mismatch if the application expects the diagnostics tables and they are missing
  - loss of persisted diagnostics history and settings if tables are dropped without preserving data
- app rollback alone is preferred if:
  - the older app version can safely ignore the extra tables
  - the problem is application behavior rather than schema integrity
- schema rollback is only needed if:
  - the migration itself causes production issues
  - diagnostics-table creation must be reversed for stability or recovery

## Trigger Conditions

Use this recovery artifact if one or more of these are true:

- realtime diagnostics endpoints fail due to schema issues
- deploy or migration failure is directly tied to `RealtimeModuleHealth` or `RealtimeEventLog`
- the schema must be restored to a pre-diagnostics state for application compatibility

## Preconditions

Before executing rollback SQL:

1. stop or pause the failing rollout
2. decide whether application rollback alone is enough
3. confirm a recent database backup exists
4. confirm no newer migration depends on these tables
5. review the SQL in `rollback.sql` before execution

## Execution Order

1. roll the application back first if possible
2. execute [rollback.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260506120000_add_realtime_diagnostics_tables/rollback.sql)
3. execute [verify.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260506120000_add_realtime_diagnostics_tables/verify.sql)
4. re-check `GET /api/v1/health/ready`
5. confirm the older application no longer references realtime diagnostics endpoints

## Recovery Notes

- this rollback preserves current diagnostics rows in backup tables before dropping the live tables
- persisted realtime settings are stored in `RealtimeEventLog`, so preserving that data matters even if the old app does not use it immediately
- backup tables are intended for later inspection or restoration, not live application use

## Follow-up

If this script is used in a real incident:

- document the release version and commit SHA involved
- record whether app rollback alone would have been sufficient
- decide whether the backup tables should be re-imported before re-enabling diagnostics in a later release
