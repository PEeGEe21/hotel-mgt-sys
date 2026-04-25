# Project Status

Last updated: 2026-04-25

## Next Up

- [ ] Email + notifications
Notes: core delivery is now in place. Next priority is expanding event coverage, finishing production polish, and improving live delivery.

## Settings

- [x] Hotel profile
- [x] Logo upload
- [x] Tax rate wired to terminal
- [x] Role permissions matrix
- [x] User permissions editor
- [x] Permission audit log + viewer
- [x] Notification preferences
- [x] Impersonation flow with audit logging
- [x] Global audit log
- [x] Password reset via profile tab

## Core Features

- [ ] Role-based dashboards
- [ ] Facilities module
Notes: bookings, cancellations, maintenance, inspections, requisitions, reports, complaints, details/actions/delete modal are covered. Remaining work is mostly polish, QA, and edge-case fixes.

- [ ] Reports
Done recently:
- shadcn tabs for consistency
- reports split into `_components`
- backend aggregate endpoints for overview, guests, staff, inventory, and occupancy
- per-tab lazy loading
- reduced frontend-heavy report computation
- naira formatting fixed in reporting UI

Still pending:
- PDF export
- Excel export
- backend-driven occupancy trends
- backend-driven room-type performance
- richer guest historical analytics
- staff attendance reporting by date range
- remove remaining report-only frontend computation
- loading, empty, and error state polish for report tabs

- [ ] Email + notifications
Done recently:
- Resend-backed transactional email sending
- notification preference enforcement by role and user overrides
- in-app notifications persisted to database
- topbar notifications bell + inbox dropdown
- full notifications page with pagination
- mailing module with sent/failed/skipped email log viewer
- `newReservation`, `paymentReceived`, and `lowInventory` events wired
- actor kept for in-app notifications and excluded from self-email by default

Still pending:
- add more event coverage: `checkIn`, `checkOut`, `maintenanceAlert`, `attendanceAlert`
- richer email templates and branding consistency
- optional linkage between in-app notifications and email delivery rows
- live delivery for in-app notifications via SSE/WebSocket
- replace raw SQL notification persistence/read paths with typed Prisma once client generation is stable
- apply pending Prisma migrations for `Notification` and `EmailDeliveryLog` in active environments

- [ ] Realtime WebSocket/SSE
Notes: kitchen display and live orders still pending. Notifications can also reuse SSE/WebSocket later for live inbox updates.

## Backlogged

- [ ] Inventory Purchase Orders tab
- [ ] Payroll PAYE + pension
- [ ] Transactional email template library polish
- [ ] Email/provider troubleshooting detail drawer in mailing viewer
- [ ] Global currency/date formatting consistency
- [ ] Dashboard loading, empty, and error state standardization
- [ ] UI-only action audit and wiring
- [ ] Duplicate/legacy page cleanup (`page2.tsx`, `page3.tsx`, `v2`)

## Production Readiness

- [x] Rate limiting
Notes: configurable API rate limiting added with `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`. Current version is in-memory; Redis-backed or distributed limiting can come later.

- [x] CORS policy
Notes: whitelist-based CORS added via `CORS_ORIGINS` / `FRONTEND_URL`.

- [~] Input sanitization / DTO validation
Notes: global `ValidationPipe` is enabled with whitelist, transform, and forbid non-whitelisted fields. Remaining work is auditing every DTO for complete decorators.

- [x] Password reset links
Notes: token-based forgot/reset password flow is implemented with emailed reset links, hashed reset tokens, expiry, and reset completion handling.

- [x] Authorization hardening
Notes: JWT auth, role and permission guards, and hotel-scoped controller/service access patterns are in place across the API.

- [x] Global exception filter
- [x] Error boundaries
- [x] Structured logging
- [ ] Error monitoring
- [ ] Uptime + alert monitoring

- [x] Health check endpoints
Notes: added `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`.

- [x] Environment validation
Notes: added fail-fast production env validation, including production hardening for `RESEND_API_KEY` and `EMAIL_FROM`.

- [ ] Docker image tagging + rollback strategy
- [ ] Database migration rollback scripts

## Infrastructure

- [ ] Redis
Notes: still needed for caching, sessions, and eventually distributed rate limiting.

- [ ] Connection pooling

- [x] Response compression
Notes: API compression middleware added.

- [ ] E2E testing
Notes: Playwright after feature freeze.

## Newly Added

- [ ] Apply pending Prisma migrations in local/staging/production for notifications and mailing logs
- [ ] Admin UX polish for mailing log filters, event grouping, and error inspection
- [ ] Notification inbox unread badge/live refresh polish after event expansion
