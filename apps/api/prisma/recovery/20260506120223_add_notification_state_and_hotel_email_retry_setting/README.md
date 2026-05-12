# Recovery: `20260506120223_add_notification_state_and_hotel_email_retry_setting`

## Migration

- migration name: `20260506120223_add_notification_state_and_hotel_email_retry_setting`
- primary tables:
  - `Hotel`
  - `Notification`

## What Changed

This migration introduced:

- `Hotel.emailAutoRetryEnabled`
- `Notification.pinnedAt`
- `Notification.archivedAt`
- indexes on `Notification(userId, pinnedAt)` and `Notification(userId, archivedAt)`

It also moved notification pin/archive state out of `Notification.metadata` and into first-class columns.

## Risk Summary

- migration type: additive plus data-moving
- primary risk:
  - application/runtime mismatch if the app expects the new columns but the database does not have them
  - notification pin/archive state loss if rollback drops the new columns without merging state back into `metadata`
- app rollback alone may be enough if:
  - no schema rollback is needed and the old app can tolerate the additional columns
- schema rollback is needed if:
  - the running application must return to metadata-based notification state handling
  - a deployment or migration issue makes the new columns unusable

## Trigger Conditions

Use this recovery artifact if one or more of these are true:

- notification inbox pin/archive flows fail after deploy
- notification queries fail due to schema mismatch around `pinnedAt` / `archivedAt`
- hotel settings or email retry logic fails because `emailAutoRetryEnabled` is unavailable or inconsistent
- you must revert to an older app version that assumes notification state lives only in `metadata`

## Preconditions

Before executing rollback SQL:

1. stop or pause the failing rollout
2. decide whether app-image rollback alone is sufficient
3. confirm a recent database backup exists
4. confirm no newer migration depends on these columns
5. review the SQL in `rollback.sql` before execution

## Execution Order

1. roll the application back first if possible
2. execute [rollback.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260506120223_add_notification_state_and_hotel_email_retry_setting/rollback.sql)
3. execute [verify.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260506120223_add_notification_state_and_hotel_email_retry_setting/verify.sql)
4. re-check `GET /api/v1/health/ready`
5. smoke-test notifications and hotel settings

## Recovery Notes

- the rollback SQL merges `pinnedAt` and `archivedAt` back into `Notification.metadata` before dropping columns
- `emailAutoRetryEnabled` is dropped last because older code will not expect it
- this script assumes PostgreSQL and JSONB support, matching the production stack

## Follow-up

If this script is used in a real incident:

- document the release version and commit SHA involved
- attach the exact failure symptoms
- update this artifact with anything learned during execution
