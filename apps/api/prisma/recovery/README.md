# Migration Recovery Scripts

This directory stores reviewed recovery SQL for risky production migrations.

Use it when a migration is:

- destructive
- data-moving
- likely to require rollback beyond simple app-image reversal

## Naming

Create one folder per risky migration:

```text
apps/api/prisma/recovery/<migration_name>/
```

Example:

```text
apps/api/prisma/recovery/20260506120223_add_notification_state_and_hotel_email_retry_setting/
```

Recommended files inside each folder:

- `README.md`
- `rollback.sql`
- `verify.sql`

## Minimum Contents

`README.md` should explain:

- what the migration changed
- what symptoms indicate rollback is needed
- whether app rollback alone is enough
- prerequisites such as backups or maintenance mode
- execution order

`rollback.sql` should contain only reviewed SQL.

`verify.sql` should contain post-recovery checks that confirm the schema/data is safe.

## Workflow

1. review the Prisma migration before production deploy
2. if risky, create a recovery folder here before release
3. have the SQL reviewed by someone other than the author when possible
4. link the recovery artifact in the release notes or deploy ticket
5. if the script is used in an incident, update it with lessons learned

## Template

Copy the template directory below when creating a new recovery artifact:

```text
apps/api/prisma/recovery/_template
```
