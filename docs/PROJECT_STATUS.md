# Project Status

Last updated: 2026-05-01

## Next Up

- [x] Mobile responsiveness
Notes: dashboard shell mobile/tablet responsiveness is now in place, including sidebar toggle/slide-in behavior and broader layout QA across key operational pages.

- [x] Web app features
Notes: installability/app-shell foundations are now in place, including manifest support and standalone web-app behavior for the browser experience.

- [ ] Background jobs / scheduler
Notes: pending. Scheduler foundation is in place and current cron-backed workflows are running, but there is still follow-on work around expanding job coverage, observability, and production hardening.

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

- [x] Role-based dashboards
Done recently:
- Prisma-backed dashboard widget registry, role layout config, and feature flag tables added
- seeded default dashboard widgets, role layouts, and non-blocking pre-SaaS feature flags
- backend dashboard module added with config, feature flags, and per-widget data endpoints
- frontend dashboard page switched from hardcoded composition to a DB-driven shared renderer
- layout preset system added for `compact`, `wide`, and `full` widget spans
- hotel-less `SUPER_ADMIN` / `ADMIN` dashboard context fallback added
- seeded role-specific widget size overrides added
- dashboard impersonation cache scope fixed
- admin/staff user update DTO validation fixed for `role` and `isActive`
- admin dashboard layout settings UI added for role widget visibility, ordering, and size presets
- dashboard layout row reordering fix shipped for admin config settings
- dashboard widget allowed sizes standardized to `compact`, `wide`, and `full`
- existing dashboard widget size options backfilled safely via Prisma migration
- dashboard settings flow verified end-to-end after migration rollout
- role-by-role browser QA confirmed across seeded roles
- browser review of widget order, span, and mobile balance completed
- loading, empty, and error state polish completed across widgets
- review weak v1 widgets and remove or replace them where needed

- [x] Facilities module
Done recently:
- facility list/detail polish fixes landed for manager selection, real capacity/location data, safer schedule parsing, and modal validation
- facilities activity surfaces were standardized onto shared drawers
- facilities reporting aggregation moved into a backend summary endpoint with a thin React Query hook on the frontend
- complaint records can now open linked maintenance requests
- maintenance records now support in-app detail review, assignment, notes, timing, cost, and status updates
- inspection records now support in-app detail review, findings, score, scheduling, and status updates
- richer facilities QA seed data added for types, locations, departments, facilities, bookings, complaints, inspections, maintenance, and requisitions
- browser QA confirmed complaint/maintenance/inspection drawers, requisitions flow, reports validation, and list/filter/status-count behavior against the seeded dataset
Notes: Facilities is now considered v1 complete. Future additions should be treated as backlog unless they introduce new module scope.

- [x] Reports
Done recently:
- shadcn tabs for consistency
- reports split into `_components`
- backend aggregate endpoints for overview, guests, staff, inventory, and occupancy
- per-tab lazy loading
- reduced frontend-heavy report computation
- naira formatting fixed in reporting UI
- backend-driven occupancy trends and room-type performance completed
- staff reporting now respects selected date ranges
- guest analytics expanded with trend-oriented data
- report contracts moved further into the backend to reduce frontend-only computation
- Excel and PDF export flows added for tab and full-report downloads
- export loading/success UI state added in the reports header
- Excel export formatting improved for widths, wrapping, currency, percentages, and dates
- export output cleaned up to avoid leaking internal IDs and nested item JSON blobs
Notes: Reports are considered v1 complete. Remaining deeper polish like bespoke PDF layouts or true per-card export should be treated as backlog, not active feature work.

- [ ] Email + notifications
Done recently:
- Resend-backed transactional email sending
- notification preference enforcement by role and user overrides
- in-app notifications persisted to database
- topbar notifications bell + inbox dropdown
- full notifications page with pagination
- mailing module with sent/failed/skipped email log viewer
- `newReservation`, `paymentReceived`, `lowInventory`, `checkIn`, `checkOut`, `maintenanceAlert`, and `attendanceAlert` events wired
- `checkOutDue` staff notification flow wired for checkout-due scheduler summaries
- actor kept for in-app notifications and excluded from self-email by default
- attendance absence alerts now use per-staff in-app notifications plus a summary email instead of one email per absent staff member
- guest-facing checkout reminder emails added with hotel-level enable/disable control
- guest checkout reminders now support day-before and same-day stages with email-log deduping
- explicit `view:mailing` permission added to frontend/backend permission matrices
- mailing API access moved from hard-coded admin roles to permission guards
- notification/email correlation metadata added for shared delivery tracing
- notification inbox items can now deep-link into related operational pages and linked mail-log views
- mailing page now supports correlation-based filtered drill-in from notification links
- checkout-due and housekeeping follow-up notifications now route into filtered reservations/task views
- browser push subscription storage and VAPID-backed push delivery added
- profile notifications settings now support browser push enable/disable flow
- in-app realtime notification sound added with per-browser on/off toggle
- self-serve test notification trigger added for settings managers to verify inbox, sound, push, and email delivery
- API env examples now document required web-push settings
- push delivery test tooling is permission-gated behind `manage:settings`

Still pending:
- richer email templates and branding consistency
- expand scheduler / jobs coverage for additional timed notification workflows
- guest-facing reminder content polish
- push delivery observability and admin-facing troubleshooting visibility
- delivery retry/failure recovery flows for important transactional emails
- deeper push delivery controls such as per-device management or explicit unsubscribe visibility

- [ ] Realtime WebSocket/SSE
Done recently:
- shared authenticated WebSocket gateway foundation
- live in-app notification delivery via WebSocket-driven inbox refresh

Still pending:
- kitchen display realtime updates
- live POS/order state propagation
- housekeeping/facilities live task board updates
- broader cross-module realtime event strategy and admin observability

- [x] Mobile Responsiveness
Note: sidebar now slides in on mobile/tablet with a toggle button and close controls.

- [x] Make Frontend into Web App
Note: manifest-driven standalone web-app support is in place.

## Backlogged

- [ ] Inventory Purchase Orders tab
- [ ] Payroll PAYE + pension
- [ ] Transactional email template library polish
- [ ] Global currency/date formatting consistency
- [x] Dashboard loading, empty, and error state standardization
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
Notes: Redis foundation is now wired into Bull plus a shared app-level Redis service for realtime presence/pub-sub. Remaining work is broader caching/session use, distributed rate limiting, and production rollout hardening.

- [ ] Background jobs / scheduler
Notes: needed for timed workflows like attendance absence detection, notification digests, retries, and other non-request-triggered tasks. This is the next infrastructure priority.

Done recently:
- attendance queue scaffolded in the API
- recurring scheduler heartbeat added for attendance jobs
- dedicated `HotelCronSetting` model added for DB-backed per-hotel scheduling
- attendance absence detection moved off admin page loads into scheduler-backed execution
- hotel settings now expose attendance absence scheduler controls
- scheduler status visibility added in hotel settings for enabled state, last run, next run, and timezone
- Redis/Bull attendance scheduler loop verified locally
- stale repeatable attendance scheduler jobs are now cleaned up and startup is idempotent against outdated repeat configs
- generic cron run-state fields added for success/failure tracking across current and future hotel jobs
- attendance scheduler now records per-hotel last success, last failure, and last error without breaking the entire scan loop
- checkout-due scheduler added with hotel-configured daily local run time
- checkout-due workflow now supports guest reminder emails, staff summary alerts, and unassigned housekeeping prep task creation
- hotel settings now support default checkout time plus guest reminder / housekeeping automation controls
- hotel settings UI has been restructured into left-side vertical tabs with per-section save actions
- reservations page now supports `Due Tomorrow`, `Due Today`, and `Overdue` checkout filters
- reservation creation flow now surfaces the hotel default checkout time to staff
- guest checkout reminders now support configurable lead days instead of only day-before / same-day timing
- housekeeping follow-up scheduler added with its own hotel cron settings, grace window, and housekeeping-targeted alerts
- checkout scheduler metadata now links reminder timing and follow-up task context more clearly across notifications/email logs
- hotel settings now support manual run-now triggers for attendance, checkout, and housekeeping follow-up schedulers to speed up QA
- shared Redis service added for app-level pub/sub and presence state
- realtime presence tracking added so staff and HR account views can show who is currently online
- websocket presence sync now invalidates staff/account views in near real time across Redis-backed events
- logout and logout-all now clear Redis presence directly so online status drops reliably when a user signs out

Still pending:
- add more timed workflows beyond attendance, checkout, and housekeeping follow-up
- improve scheduler observability further across future jobs
- add Redis-backed production hardening for broader caching, session, and distributed job support

- [ ] Connection pooling

- [x] Response compression
Notes: API compression middleware added.

- [ ] E2E testing
Notes: Playwright after feature freeze.

- [ ] Proxy Routing
Notes: Remove proxy routing.

- [x] File Input Validation
Notes: client-side image pickers now enforce allowed types and size limits consistently, and API DTOs validate image data URLs / image references for logo, avatar, product, room, and facilities image fields.

- [ ] Sessions.

## Newly Added

- [ ] Expand DB-backed cron settings beyond the current attendance / checkout / housekeeping job set
- [~] Add scheduler observability/admin visibility for last run status and failures
Notes: last run, next run, timezone, enabled state, last success/failure timestamps, and last error are now visible for attendance, checkout, and housekeeping follow-up scheduling. Remaining work is extending the same model to more job types and deeper operational visibility.
- [x] Add housekeeping follow-up job for cleaning tasks still in progress or not done
Notes: dedicated housekeeping follow-up scheduler added with grace-hour control plus housekeeping-targeted email and in-app alerts for stale checkout prep tasks.
- [~] Improve dynamic metadata across notifications and email delivery logs
Notes: checkout reminder timing and housekeeping follow-up context are now linked more clearly in metadata. Remaining work is broadening the same depth of linkage across more scheduler-driven workflows.
- [ ] Realtime event naming/payload conventions across modules
- [~] Realtime presence / online state
Notes: Redis-backed presence is now live for staff and HR account views, including websocket sync and logout-driven cleanup. Remaining work is expanding presence beyond these views and deciding whether to expose richer states than online/offline.
