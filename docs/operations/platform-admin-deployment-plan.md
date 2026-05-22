# Platform Admin Deployment Plan

This document defines the intended production shape for `apps/admin` as a standalone super-admin console.

## Deployment target

- Deploy `apps/admin` separately from `apps/web`.
- Keep `apps/api` as the shared backend for both surfaces.
- Do not host the admin console under the tenant app route tree.

## Hostnames

- `apps/web`: `app.hotelos.com` or the final tenant-facing hostname
- `apps/admin`: `admin.hotelos.com`
- `apps/api`: `api.hotelos.com`

If staging is used, mirror the same split:

- `staging-app.hotelos.com`
- `staging-admin.hotelos.com`
- `staging-api.hotelos.com`

## Admin environment variables

Set these for `apps/admin`:

- `API_URL=https://api.hotelos.com/api/v1`
- `NEXT_PUBLIC_API_URL=https://api.hotelos.com/api/v1`
- `FRONTEND_URL=https://app.hotelos.com`
- `NEXT_PUBLIC_WEB_APP_URL=https://app.hotelos.com`

Notes:

- `API_URL` and `NEXT_PUBLIC_API_URL` should both point at the shared API.
- `FRONTEND_URL` / `NEXT_PUBLIC_WEB_APP_URL` should point at the tenant-facing app because the shelved impersonation handoff, when used, launches the web app.

## API environment variables for admin support

Set or verify these on `apps/api`:

- `FRONTEND_URL=https://app.hotelos.com`
- `CORS_ORIGINS=https://app.hotelos.com,https://admin.hotelos.com`
- `PLATFORM_RATE_LIMIT_WINDOW_MS=60000`
- `PLATFORM_RATE_LIMIT_MAX=60`
- `PLATFORM_AUTH_RATE_LIMIT_WINDOW_MS=60000`
- `PLATFORM_AUTH_RATE_LIMIT_MAX=20`
- `SUPER_ADMIN_MFA_ISSUER=HotelOS Platform`
- `SUPER_ADMIN_IMPERSONATION_TTL=30m`
- `MONITORING_ALERT_WEBHOOK_URL=<ops webhook>`
- `DEPLOYMENT_ENVIRONMENT=production`
- `RELEASE_VERSION=<release label>`
- `RELEASE_COMMIT_SHA=<git sha>`

## Secrets handling

- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be production-only secrets with at least 32 characters.
- Super-admin credentials should be provisioned through deployment secrets, not committed env files.
- MFA secrets are stored per user in the database after setup; do not try to pre-seed per-user MFA secrets through env.
- `SUPER_ADMIN_MFA_ISSUER` is safe to configure through env and should be consistent across environments so authenticator labels stay stable.

## Deployment checklist

1. Deploy `apps/api` with the admin CORS origin included.
2. Deploy `apps/admin` on its own hostname.
3. Verify `apps/admin` can reach `apps/api` over the production API URL.
4. Verify super-admin login requires MFA setup or verification.
5. Verify platform pages load with the admin cookies only.
6. Verify tenant `apps/web` login remains unaffected.
7. Verify platform rate-limit headers appear on `/api/v1/platform/*`.

## Current decision on impersonation

Super-admin launched impersonation is shelved as a product priority.

Until product direction changes:

- keep the underlying auth capability safe
- do not require cross-domain handoff polish for initial admin deployment
- do not block admin deployment on impersonation UX work
