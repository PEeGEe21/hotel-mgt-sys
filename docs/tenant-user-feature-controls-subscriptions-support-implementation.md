# Tenant User Feature Controls, Subscriptions, and Support Implementation

## Purpose

This document defines the tenant-facing implementation for:

- feature controls
- subscription visibility
- support flows

This is the `apps/web` side of the same platform capabilities described in:

- [SUPER_ADMIN_PLATFORM_ROADMAP.md](/var/www/html/hotel-os/docs/SUPER_ADMIN_PLATFORM_ROADMAP.md)
- [platform-admin-feature-controls-subscriptions-support-implementation.md](/var/www/html/hotel-os/docs/platform-admin-feature-controls-subscriptions-support-implementation.md)

The goal is to make subscription and feature state visible and understandable to hotel users without turning the tenant app into a platform-admin console.

## Audience Split

This document covers hotel-side users in `apps/web`, especially:

- hotel owners/admins
- managers
- department leads
- standard staff who may see locked or unavailable features

## Overall App Placement

These capabilities belong in `apps/web`, but not all in one page.

They should show up in four patterns:

### 1. Visibility surfaces

Users need to see:

- current plan
- subscription status
- feature availability
- support status/contact path

### 2. Gating surfaces

Users need clear behavior when something is not included:

- module hidden entirely
- module visible but disabled
- action blocked with explanation
- limit reached with upgrade or support message

### 3. Self-service support surfaces

Hotel users need a support request path that does not require platform access.

### 4. Hotel-admin commercial surfaces

Hotel admins and owners need a place to see billing/contact/subscription metadata, even if they cannot fully change plans yet.

## Exact Places Needed In The Current App

## Global / Shared Surfaces

These should be driven by a resolved entitlement snapshot from the backend.

Needed in:

- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/components/layout/Topbar.tsx`
- dashboard widget rendering
- permission/feature checks around module entry points

Primary use:

- show suspension/grace/plan warnings
- show feature lock messaging
- keep navigation honest

## Dashboard

Needed in:

- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/_components/DashboardRenderer.tsx`
- `apps/web/src/app/(dashboard)/dashboard/_components/widget-registry.tsx`

Why:

- the dashboard already has feature-flag groundwork
- this is the cleanest first place to consume plan-based feature access

Expected behavior:

- disabled widgets do not render if hidden by entitlement
- optionally show upgrade/support placeholders for admin users
- standard staff should not see platform-commercial noise unless necessary

## Settings

Needed in:

- `apps/web/src/app/(dashboard)/settings/page.tsx`
- new tenant-facing pages under:
  - `apps/web/src/app/(dashboard)/settings/subscription/page.tsx`
  - `apps/web/src/app/(dashboard)/settings/support/page.tsx`

Why:

- settings is already the discovery point for hotel-level administration
- subscription summary belongs near hotel configuration, not in profile

## Profile

Needed in:

- `apps/web/src/app/(dashboard)/profile/page.tsx`

Why:

- support preferences and communication preferences fit here
- personal support history may eventually live here for the requesting user

## Module-Level Gating

Needed across:

- rooms
- reservations
- POS
- inventory
- facilities
- mailing
- reports
- dashboard widgets

Why:

- entitlement checks must not exist only on settings pages
- users experience subscriptions mostly at the point of use

## Tenant-Side Capability Model

## Feature Controls

Tenant users should not edit platform feature definitions.

They should only see:

- whether a feature is enabled
- whether it is unavailable because of plan
- whether it is unavailable because of role permission
- what to do next

Recommended user messaging states:

- `Available`
- `Unavailable for your role`
- `Not included in your current plan`
- `Temporarily disabled by platform support`
- `Unavailable while hotel account is suspended`

The app should never blur permission problems with plan problems.

## Subscription Visibility

Tenant users, especially hotel admins, should see:

- current plan name
- subscription status
- renewal/trial/grace dates
- billing contact
- included modules/features summary
- upgrade/contact-support CTA

Standard staff can see less:

- only contextually relevant lock messaging
- no detailed commercial metadata unless explicitly needed

## Support

Tenant users should be able to:

- submit support requests
- choose issue category and severity
- attach contextual details
- see current status of open requests
- review responses if we expose two-way updates

Hotel admins should additionally see:

- hotel-wide support history
- plan/support tier context
- escalation guidance

## Recommended Tenant Data Consumption

The tenant app should consume one resolved payload, not re-implement platform logic.

Recommended payload:

`GET /api/v1/me/entitlements`

Suggested shape:

- `hotel`
- `subscription`
- `features`
- `limits`
- `warnings`
- `support`

Suggested support block:

- `supportAvailable`
- `supportTier`
- `openCasesCount`
- `contactMode`

## Phased Delivery

## Phase 0: Tenant Entitlement Foundation

Status:

- DONE

Goal:

- make `apps/web` aware of resolved subscription and feature state

Build:

- shared entitlement hook in `apps/web`
- server-safe feature/plan guard helpers
- common display model for warnings and locked states

Needed in app:

- dashboard rendering
- route entry checks
- settings summary cards

## Phase 1: Read-Only Tenant Visibility

Status:

- DONE

Goal:

- show subscription and feature context without allowing tenant-side plan editing

Build in `apps/web`:

- `settings/subscription/page.tsx`
  - current plan
  - status
  - dates
  - billing contact
  - included features summary
- dashboard banner for:
  - trial ending
  - grace period
  - suspension state

Needed in current app:

- `apps/web/src/app/(dashboard)/settings/page.tsx`
  - add navigation entry for `Subscription`
- `apps/web/src/components/layout/Topbar.tsx`
  - optional global warning chip later

## Phase 2: Feature Gating UX

Status:

- DONE

Goal:

- make locked or unavailable features understandable at the point of use

Build:

- shared `FeatureGate` or equivalent pattern
- locked-state cards/placeholders for admin users
- module and widget gating driven by entitlements

Needed in current app:

- dashboard widgets
- settings cards
- module landing pages

Recommended rule:

- navigation items can be hidden when the feature is fully unavailable
- direct-route access should still show a server-backed denial state

## Phase 3: Tenant Support Request Flow

Status:

- DONE

Goal:

- let hotel users ask for help from inside the tenant app

Build in `apps/web`:

- `settings/support/page.tsx`
  - create support request
  - view open requests
  - view recent status changes

Recommended supporting UI locations:

- settings card entry
- contextual `Need help?` CTA on locked feature states
- optional support link in profile notifications or account area

Build in `apps/api`:

- tenant-safe support case create endpoint
- tenant-safe support case list endpoint for the hotel
- tenant-safe support case detail endpoint with visibility rules

## Phase 4: Hotel Admin Billing / Plan Contact Flow

Status:

- DONE

Goal:

- give hotel admins a controlled escalation/commercial path without exposing platform controls

Build:

- request plan upgrade CTA
- request billing-contact change CTA
- request feature activation CTA

This should create:

- support case or structured service request

It should not:

- directly mutate platform subscription state from `apps/web`

## Phase 5: Contextual Limits And Usage Messaging

Status:

- IN PROGRESS

Goal:

- move beyond binary on/off flags into user-friendly plan awareness

Examples:

- dashboard widgets limited by plan
- number-of-users or number-of-terminals warnings
- advanced reporting availability
- mailing or realtime diagnostics availability

This phase should only begin after the backend supports real limit values in entitlement resolution.

## Phase 6: Dynamic Commercial Requests, Full Module Gating, And Subscription Notifications

Status:

- IN PROGRESS

Goal:

- remove hardcoded tenant plan options
- block full modules and submenu trees by resolved feature access
- notify hotels when subscription state changes from platform/admin operations

Build:

- backend-provided requestable plans in tenant entitlements
- centralized module feature map for `inventory`, `housekeeping`, `facilities`, `mailing`, and future full-module flags
- sidebar and direct-route gating using resolved feature access
- hotel notification on subscription updates such as plan upgrades or status changes

This phase should:

- keep plan selection source-of-truth on the backend/platform side
- hide blocked modules from navigation
- deny direct route access with a tenant-friendly support path
- reflect subscription changes back to the hotel without requiring manual follow-up

This phase should not:

- let tenant users directly mutate plan assignments
- rely on hardcoded tenant plan catalogs once backend requestable plans exist

## Recommended Route Additions In `apps/web`

Add:

- `apps/web/src/app/(dashboard)/settings/subscription/page.tsx`
- `apps/web/src/app/(dashboard)/settings/support/page.tsx`

Keep support references also in:

- contextual locked states
- dashboard banners
- possibly `profile` for personal notification/contact preferences

## Recommended Navigation Placement

## Settings page

Add cards for:

- `Subscription`
  - description: plan, status, included features, billing contact
- `Support`
  - description: request help, track cases, contact platform support

These belong in:

- `apps/web/src/app/(dashboard)/settings/page.tsx`

## Dashboard

Add only high-signal summary elements:

- trial/grace warning
- support issue banner if hotel is suspended or degraded
- admin-only upgrade/support CTA where useful

## Profile

Keep profile focused on:

- personal notification preferences
- maybe personal support communication preferences later

Do not make profile the primary place for hotel subscription administration.

## Integration With Existing Dashboard Feature Flags

The tenant app already has the right groundwork to start here.

Relevant files:

- `apps/web/src/app/(dashboard)/settings/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/_components/DashboardRenderer.tsx`
- `apps/web/src/app/(dashboard)/dashboard/_components/widget-registry.tsx`

Recommended evolution:

1. keep existing permission checks
2. add entitlement checks beside permission checks
3. resolve hidden-vs-placeholder behavior by audience

Recommended audience behavior:

- standard staff: hide unavailable commercial surfaces unless directly relevant
- hotel admins/managers: show useful upgrade/support messaging where appropriate

## Backend Endpoints Needed For Tenant App

Recommended tenant-facing endpoints:

- `GET /api/v1/me/entitlements`
- `GET /api/v1/support/cases`
- `GET /api/v1/support/cases/:id`
- `POST /api/v1/support/cases`

Optional later:

- `POST /api/v1/support/cases/:id/comments`

## Non-Goals For Tenant App

- tenant-side plan creation
- tenant-side direct feature override management
- tenant-side billing provider management in phase 1
- tenant-side platform operations

## Risks To Avoid

### Mixing permissions with subscription logic

Users must be told whether an issue is:

- role-based
- plan-based
- temporary operational disablement

### Overexposing commercial details to standard staff

Most plan and billing details should be admin/management-facing.

### Building separate entitlement logic in the frontend

The frontend should render resolved state, not invent it.

## Definition Of Done

This tenant-side initiative is done when:

- hotel admins can see plan and subscription status in `apps/web`
- tenant users get clear feature availability messaging
- dashboard and settings surfaces consume resolved entitlements
- support requests can be created and tracked from `apps/web`
- `apps/web` reflects platform subscription and feature policy without owning it
