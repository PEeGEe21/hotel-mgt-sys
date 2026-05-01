# Monitoring And Recovery

## Monitoring Foundation

The API now supports optional webhook-based critical alerts and richer health metadata.

Set these environment variables in production:

```env
MONITORING_ALERT_WEBHOOK_URL=https://your-alert-router.example.com/hotelos
MONITORING_ALERT_DEDUP_MS=300000
DEPLOYMENT_ENVIRONMENT=production
RELEASE_VERSION=1.0.0
RELEASE_COMMIT_SHA=abc1234
```

Critical alerts are emitted for:

- API startup failure
- degraded readiness checks
- uncaught exceptions
- unhandled promise rejections
- HTTP 500-class unhandled exceptions

## Uptime Checks

Recommended external checks:

1. `GET /api/v1/health/live`
   Use for simple process liveness.
2. `GET /api/v1/health/ready`
   Use for real operational readiness. This checks:
   - API process
   - PostgreSQL connectivity
   - Redis connectivity

Recommended alert conditions:

- `ready` returns non-200 for 2 consecutive checks
- p95 readiness latency exceeds your agreed threshold
- no successful readiness checks for 5 minutes

## Release Metadata

Release metadata is surfaced in health responses. This helps confirm what version is actually running after deploys and rollbacks.

Generate a release payload locally or in CI:

```bash
node scripts/print-release-metadata.mjs
```

Example CI export:

```bash
export RELEASE_VERSION="2026.05.01-1"
export RELEASE_COMMIT_SHA="$(git rev-parse --short HEAD)"
export DEPLOYMENT_ENVIRONMENT="production"
```

GitHub Actions now computes these values automatically for CI and deploy workflows. The deploy workflow also publishes immutable GHCR tags for:

- release number + short SHA
- short SHA
- `production-current`

## Docker Tagging Strategy

Use immutable image tags for every deploy:

- semantic or date-based release tag
- commit SHA tag
- optional moving tag like `production-current`

Recommended pattern:

```text
hotelos-api:2026.05.01-1
hotelos-api:abc1234
hotelos-web:2026.05.01-1
hotelos-web:abc1234
```

Never deploy production from a mutable tag alone.

Current workflow files:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

## Rollback Strategy

If a release is unhealthy:

1. confirm failure through `/api/v1/health/ready`
2. identify the last known good image tag
3. redeploy the previous API and web image tags
4. verify release metadata on health endpoints after rollback
5. only then re-enable traffic or background job confidence checks

Minimum rollback checklist:

- previous image tags are documented
- release metadata is visible after deploy
- readiness passes after rollback
- cron/scheduler workers reconnect cleanly

## Database Migration Recovery

Prisma does not provide automatic safe production rollbacks for every migration shape, so recovery should be explicit.

Before production deploy:

1. take or confirm a recent database backup
2. review the migration SQL
3. identify whether the migration is additive, destructive, or data-moving
4. prepare a manual recovery SQL script if the migration is risky

If a migration causes production issues:

1. stop the failing rollout
2. roll application containers back first if possible
3. inspect the last applied migration:

```bash
cd apps/api
npx prisma migrate status
```

4. if schema rollback is required, use a reviewed manual SQL recovery script
5. restore from backup if data integrity is at risk
6. document the incident and convert the recovery SQL into a reusable runbook artifact

## What Still Needs Tooling

The repo now has the monitoring hooks and documented recovery flow, but these still require environment/platform wiring:

- actual webhook destination for alerts
- deployment platform wiring to consume the GHCR image tags
- automated backup verification
- runtime injection of monitoring webhook secret on the target platform
