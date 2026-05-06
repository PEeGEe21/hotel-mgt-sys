# Project Status

Last updated: 2026-05-06

## Next Up

- [~] Realtime WebSocket/SSE
Done recently:
- shared authenticated WebSocket gateway foundation
- live in-app notification delivery via WebSocket-driven inbox refresh
- Redis-backed presence tracking and logout-driven presence cleanup
- websocket presence sync now invalidates staff/account views in near real time
- standardized `pos.orders.sync` realtime payload added for POS order lifecycle events
- dashboard POS views now invalidate live from websocket order sync instead of relying mainly on short polling
- standardized `housekeeping.tasks.sync` and `facilities.maintenance.sync` hotel-scoped realtime payloads added
- housekeeping dashboard/task board and facilities maintenance board now invalidate live from websocket sync events
- kitchen/bar prep boards now surface live connection, stale-state, and last-event observability
- admin-only `settings/realtime` now exposes both session-local diagnostics and persisted hotel-level realtime history
- realtime degradation now raises cooldown-protected admin `systemAlerts` notifications with recovered-state history
- `settings/realtime` now includes per-hotel alert enablement, cooldown, retention, and module-specific stale-threshold controls
- `settings/realtime` now includes seven-day trends and module health summaries for persisted realtime diagnostics

In progress:
- optional expansion of standardized realtime payload conventions to additional future live workflows

Still pending:
- broader cross-module realtime event strategy beyond the currently tracked operational modules

## Confirmed Open Work

In progress:
1. Realtime expansion beyond notifications/presence
   cross-module realtime event conventions beyond the current operational modules
2. Scheduler and Redis production hardening
   scheduler/email retry recovery completion, broader Redis-backed caching/session/distributed support, and deeper rollout hardening
3. Notification model/settings cleanup
   hotel-level default-off auto email retry setting verification and migration of notification pin/archive state from metadata into first-class columns

Still pending:
1. Production monitoring and operational safety
   external alert routing, deploy-platform image rollout wiring, and migration-specific recovery scripts
2. Notification and reminder polish
   richer event copy/urgency/metadata consistency and deeper timed workflows such as finance collections, room blocks, and digest variants
3. Broader workflow and module backlog
   connection pooling, E2E coverage, invoices/payments/HR backlog, and duplicate/legacy page cleanup

## POS / Kitchen Flow

- [x] POS terminal authentication and kitchen-to-sales handoff
Done recently:
- terminal registration now persists with server-side device binding instead of only fragile tab/session state
- setup codes now expire properly and re-registration clears the previous device binding
- terminal actions now enforce the signed-in terminal operator server-side instead of trusting a submitted `staffId`
- terminal staff login now requires a valid PIN plus an active attendance clock-in for the current day
- new staff auto-generated employee codes now use hotel-derived prefixes plus random suffixes instead of sequential `EMP-001` style identifiers
- terminal receipts now surface same-device pending-payment recovery for unpaid delivered walk-in orders
- manage POS sales screens now expose `Mark delivered` for `READY` orders
- manage POS sales screens now expose `Continue payment` for unpaid `READY` and `DELIVERED` walk-in orders
- `Continue payment` on a `READY` order now performs the missing operational bridge by marking the order delivered before recording payment
- manage POS sales screens now include quick queue filters for `Ready to Deliver` and `Awaiting Payment`
- manage POS sales now includes `Room charges`, `Terminal`, and `Operator` filters plus a POS activity history tab
- POS audit logging now covers delivery, payment recording, terminal changes, and device deregistration

Future backlog:
- optional expeditor/runner-specific workflow if the hotel wants a dedicated handoff role between prep boards and cashier/service surfaces
- broader cleanup of duplicate/legacy POS pages once the preferred dashboard/terminal routes are finalized

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

- [~] Email + notifications
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
- email delivery logs now store retry payload metadata for replay-safe manual resend actions
- mailing page now supports manual retry for failed/skipped email deliveries when retry payload metadata is available
- notification inbox now supports pin, archive/restore, selection, and bulk actions beyond read-all
- notification inbox now supports `Active`, `Pinned`, and `Archived` views
- push subscription management now supports removing individual saved device/browser subscriptions from profile
- notification severity fallback and system-alert metadata presentation have been improved in the inbox UI
- guest checkout reminder copy has been polished with clearer departure guidance
- timed notification workflows now also cover management-targeted overdue collections escalation and room-assignment review alerts for upcoming arrivals
- reservation and scheduler in-app notifications now carry more consistent severity, summary, and context metadata across reservation, arrival, checkout, and digest flows
- daily digest notifications now include severe collections and unassigned-arrival counts so managers get a fuller nightly summary
- collections escalation alerts now distinguish severe vs critical overdue cases and include top high-risk folios for faster finance follow-up
- attendance, inventory, and maintenance notifications now present stronger inbox summaries and secondary context instead of sparse generic labels
- upcoming-arrival scans now also raise group-booking room-block review alerts when arriving grouped reservations still have unassigned rooms
- daily digest scans now also send a management-only risk digest variant when overdue, collections, arrival-allocation, housekeeping, or maintenance pressure exists
- timed workflow escalation now includes a final collections stage at 21+ overdue days
- daily and management digests now also surface grouped room-block review pressure plus critical/final collections counts

- hotel-level `emailAutoRetryEnabled` setting is now wired through schema/settings flow and defaults `off`
- notification `pinnedAt` / `archivedAt` columns are now in place so state no longer depends on JSON metadata

Still pending:
- better notification content across event titles/messages, urgency levels, and metadata summaries across all event types

- [~] Realtime WebSocket/SSE
Done recently:
- shared authenticated WebSocket gateway foundation
- live in-app notification delivery via WebSocket-driven inbox refresh
- Redis-backed presence tracking and logout-driven presence cleanup
- websocket presence sync now invalidates staff/account views in near real time
- standardized `pos.orders.sync` realtime payload added for POS order lifecycle events
- dashboard POS views now invalidate live from websocket order sync instead of relying mainly on short polling
- housekeeping/facilities live task board updates
- kitchen display realtime updates are wired at the order/prep event level, but deeper board polish/observability remains
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

- [~] Rate limiting
Done recently:
- configurable API rate limiting added with `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`

Still pending:
- Redis-backed or distributed rate limiting

- [x] CORS policy
Notes: whitelist-based CORS added via `CORS_ORIGINS` / `FRONTEND_URL`.

- [~] Input sanitization / DTO validation
Done recently:
- global `ValidationPipe` is enabled with whitelist, transform, and forbid non-whitelisted fields

Still pending:
- auditing every DTO for complete decorators

- [x] Password reset links
Notes: token-based forgot/reset password flow is implemented with emailed reset links, hashed reset tokens, expiry, and reset completion handling.

- [x] Authorization hardening
Notes: JWT auth, role and permission guards, and hotel-scoped controller/service access patterns are in place across the API.

- [x] Global exception filter
- [x] Error boundaries
- [x] Structured logging
- [~] Error monitoring
Done recently:
- webhook-based alert hooks now exist for startup failures, degraded readiness, unhandled promise rejections, uncaught exceptions, and HTTP 500-class unhandled errors

Still pending:
- wiring the webhook into a real incident destination
- tuning escalation policy
- [~] Uptime + alert monitoring
Done recently:
- `/api/v1/health/live` and `/api/v1/health/ready` are in place
- readiness now checks both PostgreSQL and Redis
- release metadata is exposed for deploy verification

Still pending:
- external uptime monitor wiring
- actual alert routing

- [x] Health check endpoints
Notes: added `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`.

- [x] Environment validation
Notes: added fail-fast production env validation, including production hardening for `RESEND_API_KEY` and `EMAIL_FROM`.

- [~] Docker image tagging + rollback strategy
Done recently:
- release metadata tooling
- immutable GHCR image tags
- Dockerfiles for API/web
- rollback runbook documentation

Still pending:
- platform-specific rollout wiring
- rollback automation
- [~] Database migration rollback scripts
Done recently:
- migration recovery runbook guidance is documented

Still pending:
- migration-specific recovery SQL/scripts for high-risk schema changes

## Infrastructure

- [~] Redis
Done recently:
- Redis foundation is wired into Bull
- shared app-level Redis service exists for realtime presence/pub-sub

Still pending:
- broader caching/session use
- distributed rate limiting
- production rollout hardening

- [~] Background jobs / scheduler
Done recently:
- timed workflows are now running for attendance, arrivals, checkout, overdue payments, housekeeping follow-up, no-show follow-up, maintenance escalation, and daily digests

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

In progress:
- scheduler-driven retry/failure recovery completion for important transactional mail
- broader Redis-backed production hardening for caching, session, and distributed job support

Still pending:
- expand timed workflows further into deeper finance collections, room blocks, and manager digest variants

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

- [ ] fiance Invoices.
Notes: creating, filtering

- [ ] Finance Payments.

- [ ] HR 
Notes: Contracts, Payroll

## Newly Added

- [x] Expand DB-backed cron settings beyond the current attendance / checkout / housekeeping job set
- [x] Add scheduler observability/admin visibility for last run status and failures
Notes: last run, next run, timezone, enabled state, last success/failure timestamps, and last error are now visible across attendance, arrivals, checkout, overdue payments, housekeeping follow-up, no-show follow-up, maintenance escalation, and daily digest scheduling.
- [x] Add housekeeping follow-up job for cleaning tasks still in progress or not done
Notes: dedicated housekeeping follow-up scheduler added with grace-hour control plus housekeeping-targeted email and in-app alerts for stale checkout prep tasks.
- [x] Add no-show follow-up, maintenance escalation, and daily digest scheduler workflows
Notes: hotel-level cron controls, run-now actions, notification preferences, and delivery/status tracking now cover front-desk no-show review, urgent maintenance escalation, and daily operational digest summaries.
- [x] Improve dynamic metadata across notifications and email delivery logs
Notes: correlation IDs, mail-log drill-ins, and richer workflow metadata now span checkout reminders, housekeeping follow-up, no-show follow-up, maintenance escalation, daily digest summaries, and related notification deep links.
- [~] Realtime event naming/payload conventions across modules
Done recently:
- standardized payload shape is now in use for POS order sync

In progress:
- extending the same contract across other live modules
- [~] Realtime presence / online state
Done recently:
- Redis-backed presence is live for staff and HR account views
- websocket sync and logout-driven cleanup are in place

In progress:
- expanding presence beyond current views

Still pending:
- deciding whether to expose richer states than online/offline
