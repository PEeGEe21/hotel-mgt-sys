# Super Admin Platform Roadmap

## Goal

Build a standalone super admin platform for HotelOS that is:

- separately hosted from the tenant-facing web app
- clearly isolated in navigation and UX
- backed by the existing shared API and auth foundations
- able to manage hotels, tenant admins, feature access, and cross-tenant support workflows

This roadmap assumes:

- `apps/web` remains the tenant-facing hotel app
- a new `apps/admin` Next.js app will be created for platform operations
- `apps/api` remains the shared backend, with stronger platform-specific guards and routes

## Why Separate `apps/admin`

We should not put super admin inside `apps/web` as just another route group if the product goal is a true platform console.

Reasons:

- platform users and hotel users are different audiences
- platform UI should have its own deployment, domain, and release flow
- route-level hiding inside one app is not the same as product-level separation
- support, impersonation, suspension, and tenant management are sensitive operations
- a dedicated app reduces accidental coupling between tenant UX and platform UX

Recommended shape:

- `apps/web`: hotel staff/admin product
- `apps/admin`: platform/super-admin console
- `apps/api`: shared backend with tenant-scoped and platform-scoped endpoints

## Current Reuse We Already Have

The current codebase already gives us a strong starting point:

- `SUPER_ADMIN` role exists in Prisma
- impersonation already exists
- dashboard role handling already includes hotel-less `SUPER_ADMIN` support
- hotels module already exists
- shared auth/session patterns already exist
- permissions and audit logging are already present

That means the main missing pieces are product structure, platform APIs, subscription models, and admin UI.

## Target Architecture

### Frontend

- `apps/web`
  - tenant-facing app
  - hotel-scoped UI only
- `apps/admin`
  - platform-facing app
  - hotel management
  - onboarding
  - user lookup
  - feature controls
  - subscriptions
  - support/impersonation

### Backend

- `apps/api`
  - keep shared Nest API
  - add platform-scoped modules/controllers/services
  - clearly separate hotel-scoped and platform-scoped operations

### Shared Packages

As the admin app grows, shared frontend logic should move into packages rather than being copied between apps.

Suggested future packages:

- `packages/shared-types`
- `packages/ui`
- `packages/auth-client`
- `packages/api-client`

`packages/shared-types` should not wait until later. It should be part of the initial scaffold so `apps/admin`, `apps/web`, and `apps/api` can share response/request shapes from the start.

## Proposed App Structure

### New app

```text
apps/admin
  package.json
  next.config.js
  tsconfig.json
  src/
    app/
      layout.tsx
      page.tsx
      login/page.tsx
      hotels/page.tsx
      hotels/[id]/page.tsx
      hotels/new/page.tsx
      users/page.tsx
      subscriptions/page.tsx
      feature-flags/page.tsx
      support/page.tsx
      audit-logs/page.tsx
    components/
    hooks/
    lib/
    store/
```

### Backend modules

Suggested new API modules:

- `platform-hotels`
- `platform-users`
- `platform-subscriptions`
- `platform-feature-flags`
- `platform-stats`
- `platform-audit`

These can live under:

```text
apps/api/src/modules/platform/
```

or as separate top-level modules if that matches the repo style better.

## Scope Definition

### Phase 1 scope

The first usable super admin platform should cover:

1. Hotel management
- list hotels
- create hotel
- view hotel details
- suspend/reactivate hotel
- assign primary tenant admin

2. Tenant onboarding
- create hotel tenant
- create initial admin user
- seed baseline hotel data
- return onboarding result and credentials handoff flow

3. User lookup
- search users across all hotels
- inspect account status
- jump to tenant context
- impersonate safely with audit trail

4. Global stats
- active hotels
- active users
- suspended hotels
- high-level occupancy/revenue rollups

### Later phases

- subscription plans
- feature entitlement management
- billing operations
- support tooling
- lifecycle automation

## Data Model Roadmap

### Keep current core tables

Do not split the database yet. Reuse existing `Hotel`, `User`, `Staff`, and audit structures.

### Add platform tables

Suggested models:

```text
SubscriptionPlan
- id
- code
- name
- description
- priceMonthly
- priceYearly
- isActive

HotelSubscription
- id
- hotelId
- planId
- status
- startsAt
- endsAt
- trialEndsAt
- billingEmail
- billingContactName

PlatformFeatureFlag
- id
- key
- name
- description
- defaultEnabled

HotelFeatureOverride
- id
- hotelId
- flagId
- enabled

HotelLifecycleEvent
- id
- hotelId
- type
- payload
- actorUserId
- createdAt

HotelHealthSnapshot
- id
- hotelId
- lastStaffLoginAt
- lastBookingCreatedAt
- lastFailedPaymentAt
- score
- status
- updatedAt
```

Notes:

- the existing dashboard `planRequired` and feature-flag groundwork can plug into this later
- phase 1 can ship before full billing exists
- plan assignment can start as manual admin-only controls

### Hotel lifecycle fields

The hotel model should also grow a few platform-operational fields:

```text
onboardingStatus
- PENDING_SETUP
- ROOMS_ADDED
- STAFF_INVITED
- ACTIVE

suspendedAt
suspensionReason
deletedAt
purgeAfterAt
```

Notes:

- `onboardingStatus` lets super admins see stuck or abandoned tenants
- `deletedAt` should be soft-delete only
- hard deletion should be a delayed/manual purge process, not a normal product action

## Security Model

This part matters more than the screens.

### Rules

- `SUPER_ADMIN` operations must be server-guarded, not just hidden in UI
- platform endpoints must not rely on hotel-scoped assumptions
- all impersonation must be audited
- impersonation must have a hard TTL and must not be silently renewed
- hotel suspension should be enforced centrally in API guards/services
- tenant admins must never see platform endpoints or app surfaces
- `apps/admin` login should require MFA before production rollout
- platform endpoints should have tighter rate limits than tenant endpoints

### Suggested permission direction

Today `SUPER_ADMIN` is mostly treated as an all-powerful role. That is fine short-term, but we should introduce explicit platform permission keys.

Examples:

- `platform:view`
- `platform:manage-hotels`
- `platform:manage-subscriptions`
- `platform:view-users`
- `platform:impersonate-users`
- `platform:view-audit`

### Additional required controls

#### Platform rate limiting

Platform routes are higher-value targets than ordinary tenant routes and should use separate throttling.

Examples:

- tenant routes: higher general limit
- platform routes: lower limit, especially for auth, impersonation, suspension, and lookup flows

Examples of sensitive platform paths:

- `/api/v1/platform/*`
- platform login
- impersonation start/stop

#### Impersonation expiry

Impersonation sessions must have a hard expiry.

Recommendation:

- 15 to 30 minute max lifetime
- non-renewable without re-authentication or explicit restart
- visually obvious in UI
- recorded in audit trail with start and stop timestamps

#### Super admin MFA

Before real tenant rollout, `apps/admin` login should require MFA.

Recommended starting point:

- TOTP-based MFA
- enforced for all `SUPER_ADMIN` accounts
- recovery codes stored and rotated safely
- temporary non-production `Skip for now` MFA bypass exists for testing and must be removed before production rollout

#### Soft delete policy

Hotels should not be hard-deleted through normal UI flows.

Recommended behavior:

- suspend first
- optional soft delete by setting `deletedAt`
- grace period, such as 30 days
- explicit purge path only for deliberate cleanup workflows

This gives us room for future support-operator roles without making everyone a full super admin.

## API Roadmap

### Phase 1 endpoints

```text
GET    /api/v1/platform/stats
GET    /api/v1/platform/hotels
POST   /api/v1/platform/hotels
GET    /api/v1/platform/hotels/:id
PATCH  /api/v1/platform/hotels/:id
POST   /api/v1/platform/hotels/:id/suspend
POST   /api/v1/platform/hotels/:id/reactivate
POST   /api/v1/platform/hotels/:id/soft-delete
POST   /api/v1/platform/hotels/:id/restore

GET    /api/v1/platform/users
GET    /api/v1/platform/users/:id
POST   /api/v1/platform/users/:id/impersonate

POST   /api/v1/platform/onboarding/hotel

GET    /api/v1/platform/audit-logs
GET    /api/v1/platform/activity-feed
```

### Later endpoints

```text
GET    /api/v1/platform/subscriptions
POST   /api/v1/platform/subscriptions/plans
PATCH  /api/v1/platform/hotels/:id/subscription

GET    /api/v1/platform/feature-flags
PATCH  /api/v1/platform/hotels/:id/feature-flags/:flagKey
```

## Frontend Roadmap

### Phase 0

Scaffold `apps/admin`:

- Next.js app shell
- `packages/shared-types` scaffolded immediately
- auth/session handling
- protected layout
- sidebar/navigation
- login page
- basic dashboard

### Phase 1

Ship the first real platform surfaces:

- dashboard
- hotels list
- hotel detail page
- create hotel flow
- user lookup
- impersonation actions
- platform activity feed
- hotel health signals
- onboarding status visibility

### Phase 2

Add platform operations:

- subscription plans
- hotel subscription assignment
- feature overrides
- audit log views

### Phase 3

Add support tooling:

- suspension workflows
- hotel health diagnostics
- onboarding status history
- platform notifications
- MFA enrollment and enforcement

## Delivery Plan

### Milestone 1: Scaffold

- create `apps/admin`
- create `packages/shared-types`
- wire workspace config
- add admin build/dev scripts
- add platform auth guard strategy
- add admin layout and login flow
- add platform MFA foundation
- add platform-specific rate limiting foundation

### Milestone 2: Platform read-only

- build global stats endpoint
- build hotels list endpoint
- build users lookup endpoint
- build activity feed endpoint
- build hotel health summary endpoint/fields
- add admin dashboard, hotels list, user lookup pages

### Milestone 3: Platform write operations

- hotel create/update/suspend/reactivate
- hotel soft delete/restore
- onboarding flow
- impersonation entry points in admin UI
- impersonation TTL enforcement
- platform audit logs

### Milestone 4: SaaS controls

- subscription tables and endpoints
- plan assignment UI
- feature-flag entitlement wiring

## Suggested Implementation Order

1. Scaffold `apps/admin`
2. Scaffold `packages/shared-types`
3. Add platform route guards and rate limits in API
4. Add platform MFA foundation
5. Add platform stats + hotels list APIs
6. Build admin dashboard and hotels page
7. Add hotel creation/onboarding flow
8. Add onboarding status tracking
9. Add cross-tenant user lookup
10. Add audited impersonation entry with TTL
11. Add hotel health signals and activity feed
12. Add suspension/reactivation and soft-delete flow
13. Add subscription models
14. Add feature entitlement management

## Non-Goals For First Release

Do not try to ship these in v1 of the admin platform:

- automated billing provider integration
- full invoicing for SaaS subscriptions
- multi-role platform support team model
- cross-region infra separation
- separate backend service just for admin

Those can come later. First we need a reliable operational console.

## Risks

### Scope creep

The platform console can easily become a second product. Keep phase 1 narrow.

### Security drift

If platform logic leaks into tenant routes or weak guards, the separation loses value.

### Shared-code sprawl

Do not import large tenant-specific UI into `apps/admin`. Share primitives, not whole screens.

### Impersonation abuse

Every impersonation path must be explicit, visible, and audited.

### Weak platform auth

Without MFA and stricter platform throttling, the admin surface becomes the highest-risk entry point in the system.

### Tenant lifecycle blind spots

Without onboarding status and hotel health scoring, support teams will not be able to quickly spot stuck or stale tenants.

## Definition of Done For Phase 1

Phase 1 is done when:

- `apps/admin` exists and deploys separately
- only `SUPER_ADMIN` can sign in
- MFA is enforced for `SUPER_ADMIN` accounts
- platform dashboard shows cross-hotel stats
- platform dashboard shows recent platform activity
- hotels can be listed, created, suspended, and reactivated
- soft delete is available without hard deletion
- a tenant admin can be created during onboarding
- onboarding status is visible for every hotel
- users can be searched across hotels
- impersonation works from the admin app with audit logs and hard expiry

## Recommended Next Step

Start with repository scaffolding and auth boundaries, not subscription billing.

Immediate build sequence:

1. create `apps/admin`
2. create `packages/shared-types`
3. share API/auth helpers cleanly
4. add platform dashboard shell
5. add hotels list + hotel details

Once those are stable, build onboarding and cross-tenant support flows.

## TODO Checklist

Use this as the working implementation tracker.

### Milestone 1: Scaffold

- [x] Create `apps/admin`
- [x] Add `apps/admin/package.json`
- [x] Add `apps/admin/tsconfig.json`
- [x] Add `apps/admin/next.config.js`
- [x] Add base `apps/admin/src/app/layout.tsx`
- [x] Add base `apps/admin/src/app/page.tsx`
- [x] Add admin login page
- [x] Add admin protected layout shell
- [x] Add admin sidebar/navigation
- [x] Create `packages/shared-types`
- [ ] Move shared platform response/request types into `packages/shared-types`
- [x] Wire workspace config so `apps/admin` and `packages/shared-types` build cleanly
- [x] Add admin build/dev scripts
- [x] Add separate admin deployment target/env plan

### Milestone 2: Security Foundations

- [x] Add platform-only API guards
- [x] Add explicit platform permission keys
- [x] Add platform-specific rate limiting for `/api/v1/platform/*`
- [x] Add admin authentication flow for `apps/admin`
- [x] Add super-admin MFA foundation
- [x] Enforce MFA for `SUPER_ADMIN` accounts before production rollout
- [x] Add impersonation TTL rules
- [x] Ensure impersonation tokens are non-renewable without explicit restart
- [ ] Add platform audit coverage for login, MFA, and impersonation events

Audit note:
Login, MFA challenge/setup/verification, and impersonation start/stop events are now audited.
One follow-up still remains if impersonation becomes active scope again: explicit expiry-event audit coverage.

### Milestone 3: Platform Read APIs

- [x] Add `GET /api/v1/platform/stats`
- [x] Add `GET /api/v1/platform/hotels`
- [x] Add `GET /api/v1/platform/hotels/:id`
- [x] Add `GET /api/v1/platform/users`
- [x] Add `GET /api/v1/platform/users/:id`
- [x] Add `GET /api/v1/platform/audit-logs`
- [x] Add `GET /api/v1/platform/activity-feed`
- [x] Add hotel health summary support
- [x] Add onboarding status visibility in platform APIs

### Milestone 4: Admin UI Read Surfaces

- [x] Build admin dashboard
- [x] Show cross-hotel stats on dashboard
- [x] Show recent platform activity feed on dashboard
- [x] Build hotels list page
- [x] Build hotel details page
- [x] Build cross-tenant user lookup page
- [x] Add global topbar search across hotels, users, and actions
- [x] Show hotel onboarding status in UI
- [x] Show hotel health indicators in UI

### Milestone 5: Hotel Management

- [x] Add hotel create endpoint
- [x] Add hotel update endpoint
- [x] Add hotel suspend endpoint
- [x] Add hotel reactivate endpoint
- [x] Add hotel soft-delete endpoint
- [x] Add hotel restore endpoint
- [x] Build create hotel UI
- [x] Build suspend/reactivate UI
- [x] Build soft-delete/restore UI
- [x] Add guardrails and confirmation flows for destructive actions

### Milestone 6: Tenant Onboarding

- [x] Add hotel onboarding endpoint
- [x] Create initial tenant admin during onboarding
- [x] Email initial tenant admin sign-in details during onboarding
- [x] Seed baseline hotel data during onboarding
- [x] Track onboarding status progression
- [x] Define onboarding states:
- [x] `PENDING_SETUP`
- [x] `ROOMS_ADDED`
- [x] `STAFF_INVITED`
- [x] `ACTIVE`
- [x] Build onboarding flow in admin UI
- [x] Show stuck/incomplete onboardings in admin dashboard

### Milestone 7: Impersonation and Support

- [ ] Add platform entry point for impersonation
- [ ] Display active impersonation state clearly in admin UI
- [ ] Show impersonation expiry countdown
- [ ] Add stop-impersonation flow
- [ ] Audit impersonation start/stop/expiry events
- [ ] Restrict impersonation to allowed platform roles only

Note:
Impersonation is shelved for now as an active roadmap slice.
Reason: the current product direction does not yet justify a super-admin-launched impersonation flow when support operators can still sign in directly through the hotel app, and the final deployment model for `apps/admin` vs `apps/web` may require a dedicated cross-domain handoff design.
Decision: keep the underlying auth capability available, but do not prioritize further platform-console impersonation UX work until the support workflow and hosting model are explicitly confirmed.

### Milestone 7b: Platform Identity Management

- [x] Add super-admin management page in `apps/admin`
- [x] Add create-super-admin platform API flow
- [x] Email new super-admin credentials on account creation
- [x] Add self-service super-admin profile page

### Milestone 8: Subscription and Feature Controls

- [ ] Add `SubscriptionPlan` model
- [ ] Add `HotelSubscription` model
- [ ] Add `PlatformFeatureFlag` model
- [ ] Add `HotelFeatureOverride` model
- [ ] Add subscription APIs
- [ ] Add hotel plan assignment UI
- [ ] Add feature override UI
- [ ] Connect plan/feature access to existing dashboard feature-flag groundwork

### Milestone 9: Health and Lifecycle

- [x] Add `onboardingStatus` field(s) to hotel lifecycle model
- [x] Add `suspendedAt` and suspension metadata
- [x] Add `deletedAt` and soft-delete metadata
- [x] Add `purgeAfterAt` grace-period support
- [x] Add hotel health snapshot model or equivalent service
- [x] Track last staff login
- [x] Track last booking created
- [ ] Track failed payment signal(s)
- [x] Define a lightweight hotel health score/status

### Milestone 10: Deployment and Operations

- [ ] Deploy `apps/admin` separately from `apps/web`
- [ ] Assign separate admin hostname/domain
- [ ] Configure admin environment variables
- [ ] Configure admin auth secrets
- [ ] Configure admin MFA secret handling
- [ ] Configure platform rate-limit storage/backing strategy
- [ ] Add admin monitoring and alerting
- [x] Add platform operational runbook

Deployment note:
The deployment plan and admin runbook are now documented in:
- [platform-admin-deployment-plan.md](/var/www/html/hotel-os/docs/operations/platform-admin-deployment-plan.md)
- [platform-admin-runbook.md](/var/www/html/hotel-os/docs/operations/platform-admin-runbook.md)
The remaining items in this milestone still require real production environment wiring and deployment execution.

### Phase 1 Done Checklist

- [ ] `apps/admin` deploys successfully
- [x] Only `SUPER_ADMIN` can sign in
- [x] MFA is enforced for super admins
- [x] Platform dashboard shows cross-hotel stats
- [x] Platform dashboard shows recent activity feed
- [x] Hotels can be listed, created, suspended, and reactivated
- [x] Soft delete exists without hard deletion
- [x] Tenant onboarding creates hotel plus initial admin
- [x] Onboarding status is visible for every hotel
- [x] Cross-tenant user lookup works
- [ ] Impersonation works with audit logs and hard expiry

### Recently Resolved

- add hotel update flow in `apps/admin` and platform API
- add lifecycle guardrails and confirmation requirements around suspend/reactivate
- remove the temporary MFA skip before production rollout
- add audit-log filtering/search in the admin UI
- add soft-delete/restore with lifecycle metadata
- add platform-specific rate limiting
- add hotel health indicators on dashboard and hotel detail pages

Updated focus note:
After those items, do not treat super-admin impersonation as the default next milestone until we confirm that support teams truly need console-launched impersonation instead of direct hotel-app sign-in, and until the final admin/web domain strategy is settled.
