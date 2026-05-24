# Keycard Auth Implementation Tracker

Status: Planned
Scope: Reservation-backed keycard authentication for the live product, gated behind a feature flag from day one.

## Goals

1. Add reservation-backed keycard issuance and revocation to the live system.
2. Keep the first release software-only with a `MockLockProvider`.
3. Gate the feature so only enabled hotels see or use it.
4. Add platform-admin oversight for rollout, configuration health, and support visibility.

## Guardrails

- Do not tie guest access to rooms alone; the source of truth is the reservation.
- Do not treat `CONFIRMED` as a fully active access state; guest usage should activate on `CHECKED_IN`.
- Do not trust tenant-supplied `hotelId` in keycard issue/revoke requests.
- Do not assume every lock tap calls HotelOS in real time.
- Do not expose keycard operations unless the hotel entitlement/feature flag is enabled.
- Do not build hardware-specific logic into tenant UI flows.

## Ticket Status Key

- `TODO`: not started
- `DOING`: currently in progress
- `DONE`: completed
- `BLOCKED`: waiting on dependency or decision

## Phase 0: Feature Gating Foundation

### KC-GATE-01 Add platform feature flag for keycard auth

Status: DONE

Scope:
- Add a platform-managed feature flag for keycard auth.
- Allow hotel-level enable/disable through platform controls.

Acceptance Criteria:
- Platform can enable or disable keycard auth per hotel.
- Tenant app can resolve whether the feature is enabled.
- Feature defaults to off unless explicitly enabled.

Implementation Notes:
- This should plug into the same entitlement/feature-control system described in:
  - [platform-admin-feature-controls-subscriptions-support-implementation.md](/var/www/html/hotel-os/docs/platform-admin-feature-controls-subscriptions-support-implementation.md)
  - [tenant-user-feature-controls-subscriptions-support-implementation.md](/var/www/html/hotel-os/docs/tenant-user-feature-controls-subscriptions-support-implementation.md)
- For early rollout, a manual platform override is acceptable before full subscription automation exists.

### KC-GATE-02 Add tenant-side feature resolution hook

Status: DONE

Scope:
- Expose the resolved keycard entitlement to `apps/web`.

Acceptance Criteria:
- Reservation, room, and settings surfaces can check whether keycard auth is enabled.
- Disabled hotels do not see keycard management actions.

## Phase 1: Schema and Backend Module

### KC-API-01 Add keycard schema

Status: DONE

Scope:
- Add `Keycard`, `KeycardAccessLog`, and supporting enums.
- Add lock config fields to `Hotel` and lock mapping fields to `Room`.

Acceptance Criteria:
- Schema supports reservation-backed credentials.
- Unknown/invalid-token access attempts can be logged without foreign-key failures.
- Room and hotel lock metadata can be stored.

### KC-API-02 Add keycards backend module

Status: DONE

Scope:
- Create `apps/api/src/modules/keycards`.
- Add controller, service, DTOs, and provider factory.

Acceptance Criteria:
- Module supports issue, list, revoke, and access-event ingest flows.
- Hotel scope is derived from auth context.

### KC-API-03 Add `MockLockProvider`

Status: DONE

Scope:
- Build the software-only provider for local and staging validation.

Acceptance Criteria:
- Issue/revoke flows work without hardware.
- Logs clearly show mock provisioning activity.

### KC-API-04 Reservation and guest validation rules

Status: DONE

Scope:
- Ensure issued keycards belong to a reservation, room, and optional guest correctly.

Acceptance Criteria:
- Reservation must belong to hotel.
- Room must match reservation room.
- Optional `guestId` must be either the primary guest or one of the `ReservationGuest` rows.
- Guest usage validity should align to `CHECKED_IN`.

### KC-API-05 Access-log ingest flow

Status: DONE

Scope:
- Add ingest endpoint/service for access events from mock flow or later vendor sync.

Acceptance Criteria:
- Granted and denied events are recorded.
- Unknown token events are recorded safely.
- Duplicate vendor event handling can be added later with `vendorEventId`.

## Phase 2: Tenant App (`apps/web`)

### KC-WEB-01 Reservation detail keycard panel

Status: IN PROGRESS

Scope:
- Add keycard management to reservation detail.

Target:
- `apps/web/src/app/(dashboard)/reservations/[id]/page.tsx`

Acceptance Criteria:
- Enabled hotels can issue keycards from reservation detail.
- Active, revoked, expired, and lost cards are visible.
- Staff can revoke and report lost cards where permitted.

### KC-WEB-02 Room detail lock metadata

Status: DONE

Scope:
- Show room lock mapping and current lock config summary on room detail.

Target:
- `apps/web/src/app/(dashboard)/rooms/[id]/page.tsx`

Acceptance Criteria:
- Room detail can show `lockDeviceId` and lock vendor context.
- This does not become the primary issue/revoke workflow.

### KC-WEB-03 Hotel settings lock configuration

Status: DONE

Scope:
- Add hotel-level lock vendor configuration to hotel settings.
- Add hotel-level keycard hotel lock enable configuration to hotel settings.

Target:
- `apps/web/src/app/(dashboard)/settings/hotel/page.tsx`

Acceptance Criteria:
- Hotel admins can store lock vendor and API config fields.
- Feature remains hidden when keycard auth is disabled.

### KC-WEB-04 Feature-gated tenant UX

Status: DONE

Scope:
- Hide or disable keycard surfaces when the entitlement is off.

Acceptance Criteria:
- No keycard actions are shown for disabled hotels.
- Direct route actions are still backend-protected.

## Phase 3: Reservation Lifecycle Hooks

### KC-LIFE-01 Auto-revoke on checkout

Status: DONE

Scope:
- Revoke all active reservation keycards during real checkout completion.

Target:
- `apps/api/src/modules/reservations/services/reservations.service.ts`

Acceptance Criteria:
- Successful checkout revokes all active keycards for that reservation.
- Revocation reason is recorded as checkout.

### KC-LIFE-02 Handle cancellation and pre-stay revocation

Status: DONE

Scope:
- Ensure cancelled stays cannot retain active keycards.

Acceptance Criteria:
- Reservation cancellation revokes prepared/active credentials if applicable.

### KC-LIFE-03 Room move reissue flow

Status: DONE

Scope:
- Define and implement how room changes revoke old room credentials and issue new ones.

Acceptance Criteria:
- A moved checked-in reservation cannot keep access to the old room.

## Phase 4: Platform Admin Oversight (`apps/admin`)

### KC-ADMIN-01 Add keycard rollout visibility to hotel detail

Status: DONE

Scope:
- Show whether keycard auth is enabled for the hotel.
- Show vendor config and lock setup completeness.

Target:
- `apps/admin/src/app/(platform)/hotels/[id]/page.tsx`

Acceptance Criteria:
- Platform admins can see:
  - whether keycard auth is enabled
  - hotel lock vendor
  - whether room lock mapping is incomplete
  - whether the hotel is using mock or real provider

### KC-ADMIN-02 Add keycard health signals to platform dashboard

Status: DONE

Scope:
- Surface rollout and operational health at the platform level.

Target:
- `apps/admin/src/app/(platform)/page.tsx`

Acceptance Criteria:
- Platform dashboard can show:
  - number of hotels with keycard auth enabled
  - number using mock vs live vendor
  - recent access failures or denial spikes
  - hotels with missing room lock mappings

### KC-ADMIN-03 Add platform support visibility for keycard incidents

Status: DONE

Scope:
- Support teams should see keycard context during tenant troubleshooting.

Targets:
- future support pages in `apps/admin`
- hotel detail support/history sections

Acceptance Criteria:
- Platform support can inspect recent keycard access-log summaries for a hotel.
- Support can distinguish configuration issues from guest lifecycle issues.

### KC-ADMIN-04 Add platform audit visibility

Status: DONE

Scope:
- Surface keycard-related actions in platform audit/search views where relevant.

Acceptance Criteria:
- Platform can review hotel-level keycard enablement changes and sensitive keycard actions.

## Phase 5: Real Vendor Integration

### KC-VENDOR-01 Add first real lock provider

Status: TODO

Scope:
- Implement one real provider after the software flow is proven.

Acceptance Criteria:
- Issue and revoke work against a real lock ecosystem.
- Provider is selected by hotel configuration.

### KC-VENDOR-02 Add access log sync or webhook ingestion

Status: TODO

Scope:
- Integrate real vendor access events where supported.

Acceptance Criteria:
- HotelOS can ingest vendor access events without pretending every door tap is a direct API call.

## Phase 6: QA

### KC-QA-01 Schema and issue flow

Status: DONE

Acceptance Criteria:
- Keycard can be issued for valid reservation context.
- Invalid room or guest relationships are rejected.

### KC-QA-02 Feature gating

Status: DONE

Acceptance Criteria:
- Disabled hotels cannot see or use keycard flows.
- Enabled hotels can.

### KC-QA-03 Checkout revocation

Status: DONE

Acceptance Criteria:
- Checkout revokes all active reservation keycards.

### KC-QA-04 Unknown token logging

Status: DONE

Acceptance Criteria:
- Unknown access token attempts are recorded without schema failure.

### KC-QA-05 Platform visibility

Status: DONE

Acceptance Criteria:
- `apps/admin` can monitor rollout, configuration gaps, and keycard incident signals.

## Recommended Build Order

1. `KC-GATE-01`
2. `KC-GATE-02`
3. `KC-API-01`
4. `KC-API-02`
5. `KC-API-03`
6. `KC-API-04`
7. `KC-WEB-01`
8. `KC-WEB-03`
9. `KC-LIFE-01`
10. `KC-WEB-02`
11. `KC-ADMIN-01`
12. `KC-ADMIN-02`
13. `KC-QA-01` to `KC-QA-05`
14. `KC-VENDOR-01`
15. `KC-VENDOR-02`

## Notes

- Operational issuance belongs primarily in `apps/web`.
- Platform monitoring and rollout control should still exist in `apps/admin`.
- The first release should be treated as a gated hotel capability, not a globally visible module.
