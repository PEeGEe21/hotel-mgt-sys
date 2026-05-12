# Recovery Template

## Migration

- migration name:
- release version:
- owner:

## Risk Summary

- migration type: additive | data-moving | destructive
- primary risk:
- fallback if app rollback alone works:

## Trigger Conditions

- readiness failures caused by schema mismatch
- application errors tied to the migrated tables/columns
- data integrity concerns

## Recovery Steps

1. pause or stop the rollout
2. roll application images back if appropriate
3. confirm backup availability
4. execute `rollback.sql`
5. execute `verify.sql`
6. re-check `/api/v1/health/ready`

## Notes

- add any migration-specific warnings here
