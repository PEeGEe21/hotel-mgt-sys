# Role-Based Dashboard System

Architecture, Design Plan & Implementation Guide

Last updated: 2026-04-28

## 1. Overview & Goals

Core principle: no `if (role === 'manager')` blocks in the frontend. Dashboard layout and widget visibility are driven by database config seeded per role and rendered by one shared system.

What this solves:
- new roles can be added without touching frontend code
- different roles can see different live data and widgets
- widgets can be gated by role permission and subscription plan
- admins can configure dashboards later without a developer

What this is not:
- a CMS
- a full admin drag-and-drop UI on day one
- a replacement for server-side permission checks

Current implementation fit:
- this architecture is compatible with the current Prisma + NestJS + React Query stack
- the permission examples in this document should follow the existing permission model in [permissions.ts](/var/www/html/hotel-os/apps/web/src/lib/permissions.ts:1)
- feature flags should exist in the design now, but must default to non-blocking until SaaS plans are introduced

## Current Status

Implemented now:
- Prisma-backed dashboard tables and migration for widget registry, role dashboard config, and feature flags
- seeded widget registry, role layouts, and non-blocking feature flags
- backend dashboard module with:
  - `GET /api/v1/dashboard/config`
  - `GET /api/v1/dashboard/feature-flags`
  - `GET /api/v1/dashboard/widgets/:widgetId`
- frontend dashboard renderer driven by DB config
- frontend widget registry and per-widget data fetching hooks
- fixed layout presets using `compact`, `wide`, and `full`
- fallback dashboard context handling for hotel-less `SUPER_ADMIN` / `ADMIN` users
- runtime removal of weak `pending_approvals` from the visible v1 dashboard
- runtime span override for `outstanding_folios` to avoid awkward empty desktop space
- improved housekeeping usefulness with a more summary-driven room-readiness widget treatment
- skeleton loading state pass for dashboard widgets

Current phase:
- phase 1, 2, and 3 are functionally in place
- phase 4 is partially complete with real-data widgets
- phase 5 QA is in progress

Still next:
- validate role-by-role widget visibility and ordering in the browser
- refine widget data quality and empty/loading/error states
- decide whether to add an admin dashboard-config UI later or continue DB-seeded only for now
- add richer future widgets like analytics and guest satisfaction when their data contracts are ready
- keep seeded DB config aligned with the latest runtime-visible widget decisions

Urgent follow-up bugs:
- after impersonation, the dashboard can still show stale data from the previous user context
- updating a staff-linked user from the admin/users flow currently fails because `role` and `isActive` are being rejected by the update DTO path

## 2. System Layers

| Layer | Lives In | Responsibility |
| --- | --- | --- |
| Widget Registry | Code (frontend) | Defines what widgets exist: IDs, components, permission keys |
| Dashboard Config | Database | Maps roles to widgets, order, enabled/disabled state |
| Feature Flags | Database | Gates widgets by subscription plan or env toggle |
| Permission Check | Server + frontend | Final hard gate independent of config |

### Request Flow

1. User authenticates and the server resolves role and plan.
2. Frontend calls `GET /api/dashboard/config` for the role's widget list and order.
3. Frontend calls `GET /api/feature-flags` for active flags tied to the user's plan.
4. For each widget:
   - check the widget exists in the registry
   - check the user has permission
   - check the feature flag is active if required
5. Render only widgets that pass all checks, in configured order.
6. Each widget fetches its own data independently.

```text
GET /api/v1/dashboard/config         -> { widgets: [...] }
GET /api/v1/dashboard/feature-flags  -> { flags: { revenue_analytics: true, ... } }
     |
     v
For each widget:
  [1] widgetRegistry.has(id)       <- exists in code?
  [2] user.permissions.has(key)    <- user allowed?
  [3] featureFlags[flag] === true  <- plan active?
     |
     v
Render <Widget /> -> widget fetches its own data
```

## 3. Database Schema

### `dashboard_widgets`

Registry mirror of what exists.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR PK` | e.g. `occupancy_chart` |
| `title` | `VARCHAR` | Human-readable widget name |
| `permission_key` | `VARCHAR` | e.g. `view:finance` |
| `feature_flag` | `VARCHAR NULL` | `null` means always available |
| `default_enabled` | `BOOLEAN` | Default seeded state |

### `role_dashboard_configs`

Per-role layout config.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `UUID PK` | Primary key |
| `role` | `VARCHAR` | e.g. `manager`, `front_desk` |
| `widget_id` | `VARCHAR FK` | References `dashboard_widgets.id` |
| `position` | `INTEGER` | Sort order, `0`-indexed |
| `enabled` | `BOOLEAN` | Toggle without deleting row |
| `size_override` | `VARCHAR NULL` | Optional layout override like `compact`, `wide`, `full` |
| `config` | `JSONB NULL` | Widget-specific overrides |

### `feature_flags`

Plan gating.

| Column | Type | Notes |
| --- | --- | --- |
| `key` | `VARCHAR PK` | e.g. `revenue_analytics` |
| `enabled` | `BOOLEAN` | Global on/off |
| `plan_required` | `VARCHAR NULL` | `free`, `pro`, `enterprise` |

## 4. Widget Registry

Each widget should live in code and be described by a registry entry.

```js
// widgetRegistry.js
export const widgetRegistry = {
  occupancy_overview: {
    id: 'occupancy_overview',
    component: OccupancyChartWidget,
    permissionKey: 'view:rooms',
    featureFlag: null,
  },
  revenue_today: {
    id: 'revenue_today',
    component: RevenueTodayWidget,
    permissionKey: 'view:finance',
    featureFlag: null,
  },
};
```

### Initial Widget Set

| Widget ID | Permission Key | Feature Flag |
| --- | --- | --- |
| `occupancy_overview` | `view:rooms` | `null` |
| `todays_checkins_outs` | `view:reservations` | `null` |
| `room_status_grid` | `view:rooms` | `null` |
| `revenue_today` | `view:finance` | `null` |
| `outstanding_folios` | `view:finance` | `null` |
| `pos_sales_today` | `view:pos` | `null` |
| `active_pos_orders` | `view:pos` | `null` |
| `low_stock_alerts` | `view:inventory` | `null` |
| `housekeeping_queue` | `view:housekeeping` | `null` |
| `staff_on_duty` | `view:attendance` | `null` |
| `my_attendance_today` | `clock:self` | `null` |
| `my_tasks_today` | `view:housekeeping` | `null` |

Note:
- `pending_approvals` was part of the initial seeded concept, but it is currently considered too weak for v1 and has been removed from the visible runtime dashboard pending replacement or redesign.

Note: we can still reuse the same existing widgets and patterns already present in [page2.tsx](/var/www/html/hotel-os/apps/web/src/app/(dashboard)/dashboard/page2.tsx:1) as the initial widget set while moving them into the shared registry-driven system.

### Widget Layout Model

To avoid the inconsistent width and placement problems seen in `page2.tsx`, widget sizing should be handled by a small layout system rather than ad hoc classes.

Recommended approach:
- use one shared dashboard grid
- use a small set of size presets instead of arbitrary width classes
- allow config to override size only within allowed presets

Initial size presets:
- `compact`: single column card
- `wide`: double-width card
- `full`: full-row card

Suggested behavior:
- mobile: all widgets stack to one column
- large screens: role config order still applies, but widget span is controlled by the preset
- widget registry defines `defaultSize` and optional `allowedSizes`
- role dashboard config may optionally store `sizeOverride`

This keeps layout predictable, allows future admin customization, and avoids each widget owning its own grid math.

## 5. Seeded Role Configs

### Super Admin / Admin / Manager

Current seeded order:
- `occupancy_overview`
- `todays_checkins_outs`
- `room_status_grid`
- `revenue_today`
- `outstanding_folios`
- `housekeeping_queue`
- `staff_on_duty`
- `low_stock_alerts`
- `pos_sales_today`
- `active_pos_orders`
- `my_attendance_today`

### Receptionist

Current seeded order:
- `todays_checkins_outs`
- `room_status_grid`
- `occupancy_overview`
- `my_attendance_today`

### Housekeeping

Current seeded order:
- `housekeeping_queue`
- `my_tasks_today`
- `room_status_grid`
- `my_attendance_today`

### Cashier

Current seeded order:
- `revenue_today`
- `outstanding_folios`
- `pos_sales_today`
- `active_pos_orders`
- `my_attendance_today`

### Bartender

Current seeded order:
- `pos_sales_today`
- `active_pos_orders`
- `low_stock_alerts`
- `my_attendance_today`

### Staff

Current seeded order:
- `my_attendance_today`

## 6. Permission System

| Key | Gates |
| --- | --- |
| `view:dashboard` | Core dashboard access and generic cross-module widgets |
| `view:rooms` | Occupancy-style room and room-status widgets |
| `view:reservations` | Check-ins, check-outs, and reservation widgets |
| `view:finance` | Revenue figures and finance widgets |
| `view:housekeeping` | Room status and housekeeping queue |
| `view:facilities` | Maintenance-style facilities queues and operational tasks |
| `view:reports` | Guest satisfaction and report-driven widgets |
| `view:attendance` | Staff-on-shift and attendance summaries |
| `view:staff` | Staff roster and people-focused widgets when needed |

### Double-Check Rule

Permissions are enforced server-side and client-side:
- server-side: API rejects unauthorized widget data requests
- client-side: widget is excluded from the DOM

Database config is a preference, not a trust boundary. A misconfigured dashboard must never leak data.

Note: use existing permission keys first. If we later need finer-grained dashboard-only permissions, they can be added deliberately rather than invented early in the PRD.

## 7. Feature Flags

| Flag | Free | Pro | Controls |
| --- | --- | --- | --- |
| `revenue_analytics` | off | on | Revenue Analytics widget |
| `guest_satisfaction` | off | on | Guest Satisfaction widget |
| `advanced_reports` | off | off (`enterprise`) | Advanced Reports |
| `null` | always | always | Core widgets never gated |

Even if HotelOS stays single-tenant for now, adding `featureFlag: null` to the registry from day one avoids a later refactor if plans are introduced.

Pre-SaaS rule:
- feature flags must not block dashboard implementation right now
- all seeded flags should default to enabled
- `plan_required` should default to `null`
- if subscription context is absent, widgets should be treated as allowed unless explicitly disabled

## 8. Implementation Plan

### Phase 1: Database & Migrations

Target: Day 1, about 3 to 4 hours.

- migration for `dashboard_widgets`
- migration for `role_dashboard_configs`
- migration for `feature_flags`
- seed all initial widgets into `dashboard_widgets`
- seed role configs from Section 5 into `role_dashboard_configs`
- seed initial feature flags with all enabled and `plan_required = null`
- run and verify

### Phase 2: API Endpoints

Target: Day 1 to 2, about 4 hours.

- `GET /api/v1/dashboard/config` returns the user's role config sorted by position and filtered to enabled rows
- `GET /api/v1/dashboard/feature-flags` returns active flags for the user's plan
- `GET /api/v1/dashboard/widgets/:widgetId` returns widget data with permission enforcement
- add `requirePermission(key)` middleware to all widget data endpoints
- verify a housekeeping user calling `/api/revenue/today` directly gets `403`

### Phase 3: Frontend Engine

Target: Day 2, about 4 hours.

- `widgetRegistry.js` defines all initial widgets
- `DashboardRenderer` iterates config, applies registry, permission, and feature-flag checks, then renders
- `usePermissions()` hook
- `useFeatureFlags()` hook
- `useDashboardConfig()` hook
- wire the engine into the app router and replace hardcoded dashboard composition
- implement shared layout presets like `compact`, `wide`, and `full` in the renderer rather than in each widget

### Phase 4: Widget Components

Target: Day 2 to 3, about 6 hours.

Implemented now:
- `occupancy_overview`
- `todays_checkins_outs`
- `room_status_grid`
- `revenue_today`
- `outstanding_folios`
- `pos_sales_today`
- `active_pos_orders`
- `low_stock_alerts`
- `housekeeping_queue`
- `staff_on_duty`
- `my_attendance_today`
- `my_tasks_today`

Still later:
- richer analytics widgets
- feature-flagged premium widgets
- dashboard-specific charts beyond the current summary-card model
- a stronger replacement for `pending_approvals` if management still needs another operational widget

### Phase 5: QA

Target: Day 3 to 4, about 3 hours.

- log in as each role and verify only the correct widgets appear
- disable a feature flag in the DB and verify the widget disappears without a deploy
- confirm a direct revenue API call returns `403` for housekeeping users
- change a position value in the DB and verify widgets reorder without a deploy
- change a widget size preset or size override and verify layout updates consistently
- document the "adding a new widget" pattern in the codebase
- confirm `SUPER_ADMIN` and hotel-less `ADMIN` users resolve dashboard context correctly

## 9. Extending the System

### New Widget

Add it to the registry, insert it into `dashboard_widgets`, then insert it into `role_dashboard_configs` for the relevant roles. The renderer picks it up automatically.

### New Role

Define it in auth, insert rows into `role_dashboard_configs`, and assign permissions. No frontend code changes should be required.

### New Plan Tier

Add it to the subscription system, update feature flag resolution, and set `plan_required` on the relevant rows. Widget components should remain unchanged.

## 10. Interaction Model

This dashboard system is config-driven, not drag-and-drop in phase 1.

Phase 1 should support:
- seeded role defaults
- widget enable/disable
- widget ordering by DB position
- optional size preset overrides

Phase 1 should not require:
- drag-and-drop layout editing
- arbitrary resize handles
- freeform page-builder behavior

This keeps the system simpler to build now while preserving a path to richer admin customization later.

## 11. File Structure

```text
apps/web/src/dashboard/
  widget-registry.tsx
  DashboardRenderer.tsx
  hooks/
    useDashboardConfig.ts
    useDashboardFeatureFlags.ts
    useDashboardWidgetData.ts
  widgets.tsx
  types.ts

apps/api/src/modules/dashboard/
  dashboard.controller.ts
  dashboard.module.ts
  dashboard.service.ts

apps/api/prisma/
  schema.prisma
  seed.ts
  migrations/
    ..._add_dashboard_config/
```

## 12. Tracking Notes

Use this file as the source of truth for dashboard implementation decisions, scope changes, and progress notes related to the role-based dashboard system.

Recommended update habits:
- update this file when widget scope changes
- update this file when schema or API design changes
- reflect milestone-level status in `PROJECT_STATUS.md`
- keep implementation details here and high-level delivery status in the status doc

## 13. Next Steps

Immediate next steps:
- browser QA across seeded roles
- verify each seeded role only sees allowed widgets
- review widget ordering and span balance on desktop and mobile
- polish empty, loading, and error states where needed
- retest manager layout after `outstanding_folios` span cleanup
- retest housekeeping usefulness after room-readiness and `my_tasks_today` empty-state improvements
- fix impersonation stale-dashboard state
- fix admin/staff update validation mismatch

After QA:
- decide whether to keep widget data endpoints centralized under `dashboard/widgets/:id` or split some widgets onto dedicated domain endpoints later
- decide whether to build a settings/admin UI for dashboard configuration or keep DB-seeded role layouts for now
- add richer analytics widgets after the first role-based dashboard rollout is stable

## 14. QA Checklist

### Role Coverage

- [ ] `SUPER_ADMIN` can load dashboard config and widgets without a staff-linked hotel row
- [ ] `ADMIN` can load dashboard config and widgets without a staff-linked hotel row
- [ ] `MANAGER` sees the seeded management dashboard set
- [ ] `RECEPTIONIST` sees only receptionist widgets
- [ ] `HOUSEKEEPING` sees only housekeeping widgets
- [ ] `CASHIER` sees only cashier widgets
- [ ] `BARTENDER` sees only bartender widgets
- [ ] `STAFF` sees only `my_attendance_today`
- [ ] impersonating into another user refreshes dashboard config and widget data cleanly

### Permission Safety

- [ ] a role without `view:finance` cannot see finance widgets
- [ ] a role without `view:pos` cannot see POS widgets
- [ ] a role without `view:housekeeping` cannot see housekeeping widgets
- [ ] direct widget data requests still fail correctly when permission is missing

### Layout & UX

- [ ] `compact`, `wide`, and `full` spans render correctly on desktop
- [ ] widgets stack cleanly on mobile
- [ ] widget ordering matches DB `position`
- [ ] empty states read clearly when no live data exists
- [ ] loading states are consistent across widgets
- [ ] error states are consistent across widgets
- [ ] `outstanding_folios` no longer leaves awkward dead space on manager desktop layout

### Data Quality

- [ ] `occupancy_overview` reflects live room totals accurately
- [ ] `todays_checkins_outs` shows correct same-day reservation activity
- [ ] `revenue_today` reflects live payments accurately
- [ ] `outstanding_folios` reflects unpaid balances accurately
- [ ] `pos_sales_today` and `active_pos_orders` feel strong enough for v1
- [ ] housekeeping `room_status_grid` / room-readiness data feels relevant enough for operational use
- [ ] `my_attendance_today` and `my_tasks_today` behave correctly for self-service roles

### Related Admin Flows

- [ ] updating a staff-linked user from the admin/users flow succeeds without DTO validation errors
