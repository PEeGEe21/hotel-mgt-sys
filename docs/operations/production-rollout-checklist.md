# Production Rollout Checklist

Use this checklist for every production release.

## Before Deploy

- confirm the release PR/commit is approved
- confirm CI passed on the exact commit being released
- confirm recent database backup exists and restore procedure is known
- review any Prisma migration SQL included in the release
- classify each migration as `additive`, `data-moving`, or `destructive`
- prepare a manual recovery SQL script for any risky migration
- confirm the target platform has these runtime env vars set:
  - `RELEASE_VERSION`
  - `RELEASE_COMMIT_SHA`
  - `DEPLOYMENT_ENVIRONMENT`
  - `MONITORING_ALERT_WEBHOOK_URL`
  - `MONITORING_ALERT_DEDUP_MS`
- confirm the monitoring webhook destination is live and owned by operations
- identify the last known good API and web image tags

## Deploy

- publish or select immutable API and web image tags
- deploy the API image first if the release depends on new backend behavior
- run `npx prisma migrate deploy` once for the target environment
- deploy the web image
- keep rollback image tags visible during the rollout window

## Verify

- check `GET /api/v1/health/live`
- check `GET /api/v1/health/ready`
- confirm readiness includes:
  - API `ok`
  - database `ok`
  - redis `ok`
- confirm release metadata on health responses matches the intended release
- confirm scheduler workers reconnect and process normally
- confirm monitoring webhook receives a test event or recent real event
- smoke-test one critical workflow:
  - login
  - reservation lookup
  - notification delivery or scheduler status page

## Rollback

- stop traffic promotion if readiness is degraded
- identify whether the fault is application-only or migration-related
- redeploy the last known good API and web image tags
- re-check `GET /api/v1/health/ready`
- confirm release metadata now shows the rolled-back version
- if the issue is schema-related, use a reviewed recovery SQL script before restoring traffic

## After Release

- record the deployed image tags
- record the release version and commit SHA
- record whether rollback artifacts were reviewed
- open follow-up items for any manual intervention used during deploy

## Related Docs

- [monitoring-and-recovery.md](/var/www/html/hotel-os/docs/operations/monitoring-and-recovery.md)
- [migration recovery README](/var/www/html/hotel-os/apps/api/prisma/recovery/README.md)
