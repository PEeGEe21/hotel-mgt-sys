# Project Status

Last updated: 2026-04-25

## Next Up

- [ ] Background jobs / scheduler
Notes: scheduler foundation is now in place. Next priority is expanding jobs for more timed notifications, retries, digest workflows, and operational visibility.

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
- `newReservation`, `paymentReceived`, `lowInventory`, `checkIn`, `checkOut`, `maintenanceAlert`, and `attendanceAlert` events wired
- actor kept for in-app notifications and excluded from self-email by default
- attendance absence alerts now use per-staff in-app notifications plus a summary email instead of one email per absent staff member

Still pending:
- richer email templates and branding consistency
- optional linkage between in-app notifications and email delivery rows
- expand scheduler / jobs coverage for additional timed notification workflows
- link notification inbox items back to mail log detail where relevant

- [ ] Realtime WebSocket/SSE
Done recently:
- shared authenticated WebSocket gateway foundation
- live in-app notification delivery via WebSocket-driven inbox refresh

Still pending:
- kitchen display realtime updates
- live POS/order state propagation
- housekeeping/facilities live task board updates
- broader cross-module realtime event strategy and admin observability

## Backlogged

- [ ] Inventory Purchase Orders tab
- [ ] Payroll PAYE + pension
- [ ] Transactional email template library polish
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

- [ ] Background jobs / scheduler
Notes: needed for timed workflows like attendance absence detection, notification digests, retries, and other non-request-triggered tasks. This is the next infrastructure priority.

Done recently:
- attendance queue scaffolded in the API
- recurring scheduler heartbeat added for attendance jobs
- dedicated `HotelCronSetting` model added for DB-backed per-hotel scheduling
- attendance absence detection moved off admin page loads into scheduler-backed execution
- hotel settings now expose attendance absence scheduler controls

- [ ] Connection pooling

- [x] Response compression
Notes: API compression middleware added.

- [ ] E2E testing
Notes: Playwright after feature freeze.

## Newly Added

- [ ] Expand DB-backed cron settings beyond attendance absence scanning
- [ ] Add scheduler observability/admin visibility for last run status and failures
- [ ] Realtime event naming/payload conventions across modules
