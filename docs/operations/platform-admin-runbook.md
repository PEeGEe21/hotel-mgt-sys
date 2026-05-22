# Platform Admin Runbook

This runbook covers the operational expectations for the standalone super-admin console.

## Scope

This applies to:

- `apps/admin`
- platform-only API routes under `/api/v1/platform/*`
- super-admin auth flows that support the admin console

## Pre-release checks

1. Confirm `apps/admin` is deployed on its own hostname.
2. Confirm API CORS includes the admin hostname.
3. Confirm a `SUPER_ADMIN` account can sign in only after MFA verification or setup.
4. Confirm a non-`SUPER_ADMIN` account cannot use the admin console successfully.
5. Confirm platform dashboard, hotels list, hotel detail, audit logs, and user lookup load correctly.
6. Confirm platform rate-limit headers are present on platform endpoints.

## Monitoring expectations

- Reuse the existing API monitoring webhook flow documented in [monitoring-and-recovery.md](/var/www/html/hotel-os/docs/operations/monitoring-and-recovery.md).
- Treat failed admin login spikes, repeated MFA failures, and platform 429 spikes as signals worth reviewing.
- Ensure each deploy sets `DEPLOYMENT_ENVIRONMENT`, `RELEASE_VERSION`, and `RELEASE_COMMIT_SHA`.

## Security checks

- Confirm the temporary admin MFA bypass is not present.
- Confirm admin cookies are `httpOnly`.
- Confirm only platform routes accept `SUPER_ADMIN` access.
- Confirm impersonation remains shelved operationally unless product direction changes.

## If admin sign-in fails

1. Check API availability and Redis availability first.
2. Confirm the admin app is calling the intended `API_URL`.
3. Confirm `JWT_SECRET`, `JWT_REFRESH_SECRET`, and Redis are consistent for the running API instances.
4. Review recent audit logs for:
   - `auth.mfa.setup_challenge`
   - `auth.mfa.login_challenge`
   - `auth.mfa.verify_success`
   - `auth.mfa.verify_failed`
   - `auth.login.super_admin`

## If platform routes are unavailable

1. Check API health/readiness.
2. Check whether rate limiting is degrading or Redis is unavailable.
3. Confirm the admin access token belongs to a `SUPER_ADMIN`.
4. Review the latest platform audit events and server logs for the affected request window.

## If a hotel lifecycle action misfires

1. Review audit logs for the exact action:
   - `platform.hotel.update`
   - `platform.hotel.suspend`
   - `platform.hotel.reactivate`
   - `platform.hotel.soft_delete`
   - `platform.hotel.restore`
2. Confirm the confirmation name and reason that were supplied.
3. Confirm the hotel's current `suspendedAt`, `deletedAt`, and `purgeAfterAt` values.

## Known deferred item

Impersonation expiry audit is not treated as a release blocker while the admin-launched impersonation slice is shelved.

If impersonation becomes active product scope again, do another pass for:

- expiry-event audit coverage
- explicit cross-domain handoff design
- operator-facing incident steps for stuck impersonation sessions
