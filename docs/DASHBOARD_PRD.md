# Role-Based Dashboard System

Architecture, Design Plan & Implementation Guide

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
GET /api/dashboard/config  -> { widgets: [...], order: [...] }
GET /api/feature-flags     -> { revenue_analytics: true, ... }
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
  occupancy_chart: {
    id: 'occupancy_chart',
    component: OccupancyChartWidget,
    permissionKey: 'view:rooms',
    featureFlag: null,
  },
  revenue_analytics: {
    id: 'revenue_analytics',
    component: RevenueAnalyticsWidget,
    permissionKey: 'view:finance',
    featureFlag: 'revenue_analytics',
  },
};
```

### Initial Widget Set

| Widget ID | Permission Key | Feature Flag |
| --- | --- | --- |
| `occupancy_chart` | `view:rooms` | `null` |
| `checkins_today` | `view:reservations` | `null` |
| `checkouts_today` | `view:reservations` | `null` |
| `housekeeping_status` | `view:housekeeping` | `null` |
| `maintenance_queue` | `view:facilities` | `null` |
| `revenue_today` | `view:finance` | `null` |
| `revenue_analytics` | `view:finance` | `revenue_analytics` |
| `guest_satisfaction` | `view:reports` | `guest_satisfaction` |
| `staff_on_shift` | `view:attendance` | `null` |
| `alerts_feed` | `view:dashboard` | `null` |

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

### Manager

Position `0` to `7`:
- `occupancy_chart`
- `revenue_today`
- `revenue_analytics`
- `checkins_today`
- `housekeeping_status`
- `maintenance_queue`
- `guest_satisfaction`
- `alerts_feed`

### Front Desk

Position `0` to `3`:
- `checkins_today`
- `checkouts_today`
- `occupancy_chart`
- `alerts_feed`

### Housekeeping

Position `0` to `1`:
- `housekeeping_status`
- `alerts_feed`

### Maintenance

Position `0` to `2`:
- `maintenance_queue`
- `housekeeping_status`
- `alerts_feed`

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

- `GET /api/dashboard/config` returns the user's role config sorted by position and filtered to enabled rows
- `GET /api/feature-flags` returns active flags for the user's plan
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

- `OccupancyChartWidget` -> `GET /api/occupancy/summary`
- `CheckinsTodayWidget` -> `GET /api/reservations/today?type=checkin`
- `CheckoutsTodayWidget` -> `GET /api/reservations/today?type=checkout`
- `HousekeepingStatusWidget` -> `GET /api/housekeeping/status`
- `MaintenanceQueueWidget` -> `GET /api/maintenance/queue`
- `RevenueTodayWidget` -> `GET /api/revenue/today`
- `AlertsFeedWidget` -> `GET /api/alerts`
- stub `RevenueAnalyticsWidget` and `GuestSatisfactionWidget` behind feature flags for later build-out

### Phase 5: QA

Target: Day 3 to 4, about 3 hours.

- log in as each role and verify only the correct widgets appear
- disable a feature flag in the DB and verify the widget disappears without a deploy
- confirm a direct revenue API call returns `403` for housekeeping users
- change a position value in the DB and verify widgets reorder without a deploy
- change a widget size preset or size override and verify layout updates consistently
- document the "adding a new widget" pattern in the codebase

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
src/dashboard/
  widgetRegistry.js
  DashboardRenderer.jsx
  hooks/
    usePermissions.js
    useFeatureFlags.js
    useDashboardConfig.js
  widgets/
    OccupancyChartWidget.jsx
    CheckinsTodayWidget.jsx
    ... (one file per widget)

server/
  routes/dashboard.js
  routes/featureFlags.js
  middleware/requirePermission.js

db/
  migrations/
    ..._create_dashboard_widgets.js
    ..._create_role_dashboard_configs.js
    ..._create_feature_flags.js
  seeds/
    dashboard_widgets.js
    role_dashboard_configs.js
    feature_flags.js
```

## 12. Tracking Notes

Use this file as the source of truth for dashboard implementation decisions, scope changes, and progress notes related to the role-based dashboard system.

Recommended update habits:
- update this file when widget scope changes
- update this file when schema or API design changes
- reflect milestone-level status in `PROJECT_STATUS.md`
- keep implementation details here and high-level delivery status in the status doc
