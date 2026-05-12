# Render Deployment Notes

This file covers Render-specific deployment wiring for HotelOS.

Keep the core operational process in the generic docs:

- [production-rollout-checklist.md](/var/www/html/hotel-os/docs/operations/production-rollout-checklist.md)
- [monitoring-and-recovery.md](/var/www/html/hotel-os/docs/operations/monitoring-and-recovery.md)

If the project moves away from Render later, replace this file with a new platform-specific guide instead of rewriting the shared operational docs.

## Recommended Service Shape

Use separate Render services for:

- API service
- Web service
- worker/scheduler service if background jobs need isolated runtime control
- PostgreSQL
- Redis

## Runtime Environment Variables

Set these on the relevant Render services:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `MONITORING_ALERT_WEBHOOK_URL`
- `MONITORING_ALERT_DEDUP_MS`
- `DEPLOYMENT_ENVIRONMENT=production`
- `RELEASE_VERSION`
- `RELEASE_COMMIT_SHA`

Set `CORS_ORIGINS` and `FRONTEND_URL` to the final web app URL.

## Deployment Model

Recommended pattern:

- build immutable images in CI
- publish them to GHCR
- deploy the chosen image version to Render
- keep the previous known-good image tag available for rollback

## Health Checks

Use:

- liveness: `/api/v1/health/live`
- readiness: `/api/v1/health/ready`

Prefer routing production confidence decisions from readiness, not liveness.

## Background Jobs

If scheduler and queue processing must stay reliable during web/API restarts, use a dedicated worker-style service rather than depending only on the main API runtime.

## Rollback

Rollback should mean:

1. choose the last known good API image tag
2. choose the last known good web image tag
3. redeploy those versions
4. verify `/api/v1/health/ready`
5. verify release metadata now matches the rolled-back release

If rollback involves a risky Prisma change, follow the recovery artifact flow in:

- [apps/api/prisma/recovery/README.md](/var/www/html/hotel-os/apps/api/prisma/recovery/README.md)

## Render-Specific Checklist

- confirm all production env vars are present in Render
- confirm PostgreSQL and Redis are reachable from the API runtime
- confirm health check path is set to readiness, not only liveness
- confirm release metadata env vars are updated on each deploy
- confirm alert webhook secret/destination is configured
- confirm at least one rollback image version is documented

## Migration Handling

For production releases with schema changes:

- run Prisma deploy once per release
- avoid running the same migration step independently from multiple services
- prepare a recovery folder for risky migrations before rollout

## If You Move Off Render Later

Do not rewrite the shared ops docs.

Instead:

1. keep the generic rollout and monitoring docs
2. add a new platform file such as `platform-railway.md`
3. migrate only:
   - deploy wiring
   - env var setup
   - health check configuration
   - worker/runtime topology
   - rollback button/process
