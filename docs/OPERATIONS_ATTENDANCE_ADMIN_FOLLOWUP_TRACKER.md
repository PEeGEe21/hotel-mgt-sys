# Operations, Attendance, and Admin Follow-up Tracker

Status: IN PROGRESS

This tracker covers the next priority wave across `apps/web`, `apps/api`, and `apps/admin`.

## Delivery Order

1. Room quick actions wiring
2. Guest mobile responsiveness and operational quick actions
3. Country, state, and currency dropdown parity in tenant and admin hotel profile flows
4. Attendance stale clock-out policy and auto clock-out
5. Shift-to-staff assignment model
6. Super admin hotel error observability

## Phase 1: Room Quick Actions

Status: DONE

Goal:

- turn room detail actions into real operational workflows

Build in `apps/web`:

- wire `Add Charge` to active folio charge creation
- wire `Request Cleaning` to housekeeping task creation
- wire `Log Issue` to maintenance request creation
- wire `Assign Housekeeper` to staff assignment flow
- wire `View Reservations` to reservation list/detail context
- wire header `New Booking` and `Check Out` where room context already supports them

Primary files:

- `apps/web/src/app/(dashboard)/rooms/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/housekeeping/_components/NewTaskModal.tsx`
- `apps/web/src/hooks/useHousekeeping.ts`
- `apps/web/src/hooks/facility/useFacilityMaintenance.ts`

Acceptance criteria:

- room actions no longer behave like placeholders
- add charge posts against the active reservation folio
- cleaning request creates a housekeeping task with room context
- maintenance issue creates a maintenance request with room context
- assign housekeeper can assign an existing open room task or create one when needed
- reservations action takes staff to the relevant room reservation context

## Phase 2: Guest Detail Mobile And Quick Actions

Status: DONE

Goal:

- make guest detail feel operational on mobile and complete the broken quick actions

Build in `apps/web`:

- tighten mobile header/action layout
- replace browser `confirm` or `alert` flows with app-native confirmation
- wire `New Reservation`
- wire `Add Folio Charge`
- wire `Check Out`

Primary files:

- `apps/web/src/app/(dashboard)/guests/[id]/page.tsx`

Acceptance criteria:

- guest quick actions execute real reservation and folio flows
- checkout confirmation uses in-app UI instead of browser dialogs
- guest mobile layout keeps actions reachable and readable

## Phase 3: Country, State, Currency Dropdown Parity

Status: DONE

Goal:

- keep hotel profile editing consistent across tenant and super admin flows

Build in `apps/web`:

- extend country dropdown metadata into hotel settings profile update
- derive state list from selected country
- derive default currency from selected country while still allowing override

Build in `apps/admin`:

- replace free-text country, state, and currency hotel edit fields with structured dropdowns

Primary files:

- `apps/web/src/app/(dashboard)/settings/hotel/page.tsx`
- `apps/admin/src/components/platform/HotelDetailClient.tsx`
- `apps/admin/src/lib/country-metadata.ts`

Acceptance criteria:

- tenant and super admin hotel profile edits use the same country/state metadata source
- state options react to selected country
- currency defaults intelligently and remains editable

## Phase 4: Attendance Stale Clock-out Policy

Status: DONE

Goal:

- stop previous-day open attendance sessions from breaking the next day

Build in `apps/api`:

- stale open-session detection before new clock-in
- configurable auto clock-out policy for previous-day open sessions
- audit-friendly auto closeout reason

Build in `apps/web`:

- clock page messaging when an auto closeout happened
- manager-friendly visibility for corrected sessions

Primary files:

- `apps/api/src/modules/attendance/services/attendance.service.ts`
- `apps/web/src/app/(dashboard)/clock/page.tsx`
- hotel attendance-related settings if configuration is exposed

Acceptance criteria:

- staff cannot silently accumulate multi-day open sessions
- stale sessions are auto-closed or explicitly blocked according to policy
- managers can distinguish auto clock-outs from normal ones

## Phase 5: Shift-To-Staff Assignment

Status: DONE

Goal:

- make shifts the expectation layer for attendance instead of standalone templates
- add a dedicated override scheduling layer so operations do not need to edit staff records for every temporary shift change

Build in `apps/api`:

- staff default shift assignment
- optional date-specific override structure
- shift-aware attendance evaluation
- override CRUD endpoints for attendance operations

Build in `apps/web`:

- assign default shift on staff detail or staff management
- show active shift context on clock and attendance views
- dedicated `Attendance > Shift Schedule` page for override management

Primary files:

- `apps/api/src/modules/shifts/*`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/app/(dashboard)/staff/*`
- `apps/web/src/app/(dashboard)/clock/page.tsx`

Acceptance criteria:

- staff can be assigned a default shift
- temporary overrides can be created without editing the staff profile
- attendance can reference assigned shift windows
- groundwork exists for late, early-out, and off-shift evaluation

## Phase 6: Super Admin Hotel Error Observability

Status: DONE

Goal:

- give platform operations a real hotel-level error and incident view

Build in `apps/admin`:

- hotel-scoped error summary panel
- recent incident and failure feed
- links to related hotel lifecycle, support, and health context

Build in `apps/api`:

- hotel-scoped observability read endpoints
- normalized application-error and failed-job summaries

Acceptance criteria:

- super admin can see meaningful hotel-level runtime issues
- observability surfaces are filtered, not raw noisy logs
- support can correlate errors with hotel state and open cases
