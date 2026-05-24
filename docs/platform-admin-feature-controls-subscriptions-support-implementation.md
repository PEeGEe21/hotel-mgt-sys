# Platform Admin Feature Controls, Subscriptions, and Support Implementation

## Purpose

This document turns the suggested models and direction in [SUPER_ADMIN_PLATFORM_ROADMAP.md](/var/www/html/hotel-os/docs/SUPER_ADMIN_PLATFORM_ROADMAP.md) into a focused implementation plan for the platform-admin side of the product.

This is the `apps/admin` and platform-API view of:

- feature controls
- subscriptions
- support operations

It answers two questions:

1. Where do these capabilities belong in the current app shape
2. In what phases should we build them without overloading phase 1

## Source Of Truth

Base roadmap:

- [SUPER_ADMIN_PLATFORM_ROADMAP.md](/var/www/html/hotel-os/docs/SUPER_ADMIN_PLATFORM_ROADMAP.md)

Relevant existing app surfaces:

- `apps/admin/src/app/(platform)/page.tsx`
- `apps/admin/src/app/(platform)/hotels/page.tsx`
- `apps/admin/src/app/(platform)/hotels/[id]/page.tsx`
- `apps/admin/src/app/(platform)/users/page.tsx`
- `apps/admin/src/app/(platform)/audit-logs/page.tsx`
- `apps/admin/src/app/(platform)/admins/page.tsx`
- `apps/web/src/app/(dashboard)/settings/page.tsx`
- `apps/web/src/app/(dashboard)/settings/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/_components/DashboardRenderer.tsx`
- `apps/api/src/modules/platform/*`

## Overall App Placement

These features should not live in one place only. They span four layers:

### 1. `apps/admin`

This is the operational control surface for:

- plan creation and maintenance
- hotel subscription assignment
- hotel-level feature overrides
- cross-tenant support workflows
- support case visibility and operator actions

Recommended platform routes:

- `apps/admin/src/app/(platform)/subscriptions/page.tsx`
- `apps/admin/src/app/(platform)/subscriptions/plans/page.tsx`
- `apps/admin/src/app/(platform)/feature-controls/page.tsx`
- `apps/admin/src/app/(platform)/support/page.tsx`
- `apps/admin/src/app/(platform)/support/[id]/page.tsx`
- `apps/admin/src/app/(platform)/hotels/[id]/subscription/page.tsx`
- `apps/admin/src/app/(platform)/hotels/[id]/features/page.tsx`
- `apps/admin/src/app/(platform)/hotels/[id]/support/page.tsx`

### 2. `apps/api`

This is the enforcement and source-of-truth layer for:

- subscription plans
- hotel subscription state
- feature entitlements
- feature override resolution
- support case records
- support event/audit history

Recommended module grouping:

- `apps/api/src/modules/platform/platform-subscriptions`
- `apps/api/src/modules/platform/platform-feature-flags`
- `apps/api/src/modules/platform/platform-support`

### 3. `apps/web`

The tenant app should not administer platform policy, but it must consume the resolved outcome:

- what plan the hotel is on
- what features are enabled
- whether support is available
- whether plan limits or grace periods affect access

### 4. Shared Types / Shared Entitlement Resolution

We should keep request/response and entitlement shapes shared across apps:

- `packages/shared-types`

That is especially important for:

- subscription summary payloads
- feature-flag payloads
- support ticket payloads
- hotel entitlement snapshots

## Platform Capabilities By Area

## Feature Controls

Platform-admin responsibilities:

- define global feature catalog
- define default plan entitlements
- override hotel-level access
- view which hotels are using which features
- suspend or enable features safely with audit logs

This is broader than dashboard feature flags. It should eventually gate:

- modules
- sub-features
- operational limits
- beta access
- support access tiers

### Admin surfaces needed

- global feature catalog page
- hotel feature override panel
- hotel detail entitlement summary
- audit trail for feature changes

### Backend capabilities needed

- feature definition model
- hotel override model
- entitlement resolution service
- audit events for every change

## Subscriptions

Platform-admin responsibilities:

- create and maintain plans
- assign plans to hotels
- manage trial, active, suspended, expired, and grace states
- control manual billing metadata for now
- surface plan impacts to support and operations teams

### Admin surfaces needed

- plans list
- create/edit plan form
- hotel subscription assignment panel
- hotel billing/contact summary
- trial and renewal state visibility

### Backend capabilities needed

- `SubscriptionPlan`
- `HotelSubscription`
- status transitions
- effective entitlement derivation from plan plus overrides

## Support

Platform-admin responsibilities:

- see tenant support requests
- classify severity and ownership
- inspect hotel health before acting
- coordinate support without defaulting to impersonation
- link support actions to lifecycle, subscription, and feature state

### Admin surfaces needed

- support inbox
- support detail page
- hotel support history in hotel detail
- internal notes / assignment / status flow
- linked hotel health snapshot
- linked subscription and entitlement summary

### Backend capabilities needed

- support case model
- support comment/event model
- support assignment state
- support-to-hotel linkage
- audit coverage for sensitive support actions

## Recommended Data Model Shape

These come from the roadmap direction, with support additions made explicit.

### Subscription models

`SubscriptionPlan`

- `id`
- `code`
- `name`
- `description`
- `priceMonthly`
- `priceYearly`
- `billingIntervalOptions`
- `isActive`
- `isPublic`
- `sortOrder`

`HotelSubscription`

- `id`
- `hotelId`
- `planId`
- `status`
- `startsAt`
- `endsAt`
- `trialEndsAt`
- `graceEndsAt`
- `billingEmail`
- `billingContactName`
- `notes`

### Feature control models

`PlatformFeatureFlag`

- `id`
- `key`
- `name`
- `description`
- `category`
- `defaultEnabled`
- `scopeType`
- `rolloutStage`

`PlanFeatureEntitlement`

- `id`
- `planId`
- `flagId`
- `enabled`
- `limitValue`

`HotelFeatureOverride`

- `id`
- `hotelId`
- `flagId`
- `enabled`
- `limitValue`
- `reason`

### Support models

`SupportCase`

- `id`
- `hotelId`
- `createdByUserId`
- `source`
- `category`
- `priority`
- `status`
- `subject`
- `description`
- `assignedAdminId`
- `subscriptionSnapshot`
- `entitlementSnapshot`
- `createdAt`
- `updatedAt`

`SupportCaseEvent`

- `id`
- `caseId`
- `actorUserId`
- `type`
- `payload`
- `createdAt`

`SupportCaseComment`

- `id`
- `caseId`
- `authorUserId`
- `visibility`
- `body`
- `createdAt`

## Entitlement Resolution

This should be one shared backend service, not scattered checks.

Resolution order:

1. system default
2. plan entitlement
3. hotel override
4. emergency platform override if we ever add one

Output shape should include:

- `plan`
- `subscriptionStatus`
- `features`
- `limits`
- `warnings`

Recommended API result name:

- `HotelEntitlementSnapshot`

This same resolved snapshot should power:

- `apps/admin` hotel detail pages
- `apps/web` tenant-facing visibility
- dashboard feature gating
- future module gating

## Phased Delivery

## Phase 0: Shared Foundations

Goal:

- make the platform models and payloads stable before building lots of UI

Build:

- move platform request/response types into `packages/shared-types`
- define subscription and feature-control enums/statuses
- add entitlement snapshot DTOs
- add support case DTOs

Needed in the app:

- `apps/admin` hooks and pages
- `apps/web` entitlement consumption
- `apps/api` platform endpoints

## Phase 1: Admin Read Surfaces

Goal:

- give platform operators visibility before full write tooling

Build in `apps/admin`:

- `subscriptions/page.tsx`
  - list plans
  - list hotel assignments
  - show counts by status
- `feature-controls/page.tsx`
  - global feature catalog
  - current plan mapping summary
- `support/page.tsx`
  - support inbox
  - queue by priority/status/category

Build in `apps/api`:

- `GET /api/v1/platform/subscriptions`
- `GET /api/v1/platform/feature-flags`
- `GET /api/v1/platform/support`
- `GET /api/v1/platform/support/:id`
- `GET /api/v1/platform/hotels/:id/entitlements`

Why this phase belongs here:

- platform teams need read visibility before making changes
- support cannot work well without seeing plan and feature context alongside hotel health

## Phase 2: Subscription Operations

Goal:

- make plan and assignment changes operationally usable

Build in `apps/admin`:

- plans create/edit page
- hotel subscription assignment drawer on hotel detail
- hotel billing contact editor
- trial/grace state controls

Build in `apps/api`:

- `POST /api/v1/platform/subscriptions/plans`
- `PATCH /api/v1/platform/subscriptions/plans/:id`
- `PATCH /api/v1/platform/hotels/:id/subscription`

App placement:

- hotel-level assignment belongs inside `apps/admin/src/app/(platform)/hotels/[id]/page.tsx`
- cross-hotel reporting belongs on `apps/admin/src/app/(platform)/subscriptions/page.tsx`

## Phase 3: Feature Control Operations

Goal:

- allow platform to control access safely without code deploys

Build in `apps/admin`:

- plan entitlement editor
- hotel feature override editor
- feature change history timeline

Build in `apps/api`:

- `PATCH /api/v1/platform/subscriptions/plans/:id/entitlements`
- `PATCH /api/v1/platform/hotels/:id/feature-flags/:flagKey`
- shared entitlement resolution service

App placement:

- global controls belong in `apps/admin`
- resolved entitlements must flow into `apps/web`

Critical integration point:

- connect to existing dashboard feature-flag groundwork in:
  - `apps/web/src/app/(dashboard)/settings/dashboard/page.tsx`
  - `apps/web/src/app/(dashboard)/dashboard/_components/DashboardRenderer.tsx`

## Phase 4: Support Operations

Goal:

- build support workflows that do not depend on impersonation

Build in `apps/admin`:

- support queue
- support case detail
- case assignment
- internal notes
- linked hotel health and lifecycle panel
- linked subscription/entitlement panel

Build in `apps/api`:

- support case create/update/comment endpoints
- support event logging
- support assignment and status transitions

Recommended status model:

- `OPEN`
- `TRIAGED`
- `IN_PROGRESS`
- `WAITING_ON_HOTEL`
- `RESOLVED`
- `CLOSED`

Why it belongs here:

- support is a platform operation, not a tenant setting
- cross-hotel support views should not leak into `apps/web`

## Phase 5: Sensitive Support Controls

Goal:

- add higher-risk operational tools only after the lower-risk support flow is solid

Optional later additions:

- impersonation entry point
- stop impersonation flow
- explicit expiry countdown
- support escalation policies
- platform notifications for aging cases

Important roadmap constraint:

- do not force console-launched impersonation into the next milestone unless support workflow and domain strategy are confirmed

## Exact Places Needed In The Current Product

## In `apps/admin`

Must exist:

- dashboard summary cards should include:
  - hotels by subscription state
  - support queue counts
  - hotels with feature overrides
- hotel detail page should include:
  - subscription summary section
  - feature entitlement section
  - support history section
- top-level nav should add:
  - `Subscriptions`
  - `Feature Controls`
  - `Support`

## In `apps/api`

Must exist:

- platform subscription module
- platform feature-control module
- platform support module
- shared entitlement resolution service
- audit hooks for:
  - plan changes
  - hotel plan assignment
  - feature override changes
  - support case updates

## In `apps/web`

Must consume but not administer:

- current plan summary
- hotel entitlement snapshot
- support availability indicators

## Recommended Order

1. shared types
2. read APIs
3. `apps/admin` read screens
4. subscription write APIs and hotel assignment UI
5. feature entitlement wiring
6. support queue and support case detail
7. later sensitive controls

## Non-Goals For This Slice

- automated SaaS billing provider integration
- customer self-serve checkout
- complex seat-based billing
- multi-tier platform support org design
- full CRM-style support suite

## Definition Of Done

This admin-side initiative is done when:

- `apps/admin` can view and edit hotel subscription state
- `apps/admin` can view and edit hotel feature entitlements
- `apps/admin` can triage support without using tenant routes
- `apps/api` resolves effective entitlements consistently
- `apps/web` consumes resolved entitlements without owning platform policy
