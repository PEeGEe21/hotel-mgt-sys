# Render Deployment Notes

This file covers Render-specific deployment wiring for HotelOS.

Keep the core operational process in the generic docs:

- [production-rollout-checklist.md](/var/www/html/hotel-os/docs/operations/production-rollout-checklist.md)
- [monitoring-and-recovery.md](/var/www/html/hotel-os/docs/operations/monitoring-and-recovery.md)

If the project moves away from Render later, replace this file with a new platform-specific guide instead of rewriting the shared operational docs.

## Recommended Service Shape

Use Render for:

- API service
- worker/scheduler service if background jobs need isolated runtime control
- PostgreSQL
- Redis

The repo now includes a Render Blueprint starter at [render.yaml](/var/www/html/hotel-os/render.yaml:1) for the API image-backed service.

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

When using the GitHub Actions rollout job, these are updated automatically on every deploy:

- `RELEASE_VERSION`
- `RELEASE_COMMIT_SHA`
- `DEPLOYMENT_ENVIRONMENT`
- `MONITORING_ALERT_DEDUP_MS`

The API service also receives `MONITORING_ALERT_WEBHOOK_URL` during rollout.

Keep the remaining production secrets directly on Render as synced or manually managed service env vars.

## Render Credential + Service Setup

Before turning on automated rollouts:

1. add a GHCR registry credential in Render named `hotelos-ghcr`
2. create or sync the API service as an image-backed service
3. point it at:
   - `ghcr.io/<owner>/hotelos-api`
4. note the Render service ID for the API service
5. add these GitHub repository secrets:
   - `RENDER_API_KEY`
   - `RENDER_API_SERVICE_ID`
   - `MONITORING_ALERT_WEBHOOK_URL`
6. optionally add GitHub repository variable `MONITORING_ALERT_DEDUP_MS`

## Deployment Model

Recommended pattern:

- build immutable images in CI
- publish them to GHCR
- deploy the chosen image version to Render
- keep the previous known-good image tag available for rollback

Current repo automation:

- `.github/workflows/deploy.yml` builds and pushes the immutable API image
- if the Render secrets above exist, the same workflow updates runtime release metadata and triggers the Render API image deploy
- the rollout script used by CI is [scripts/render-rollout.mjs](/var/www/html/hotel-os/scripts/render-rollout.mjs:1)

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
2. redeploy that version
3. verify `/api/v1/health/ready`
4. verify release metadata now matches the rolled-back release

If rollback involves a risky Prisma change, follow the recovery artifact flow in:

- [apps/api/prisma/recovery/README.md](/var/www/html/hotel-os/apps/api/prisma/recovery/README.md)

## Render-Specific Checklist

- confirm all production env vars are present in Render
- confirm PostgreSQL and Redis are reachable from the API runtime
- confirm health check path is set to readiness, not only liveness
- confirm release metadata env vars are updated on each deploy
- confirm alert webhook secret/destination is configured
- confirm the services are image-backed and can pull from the `hotelos-ghcr` Render registry credential
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
