# POS Implementation Tracker

Status: Awaiting Manual UI QA
Scope: Live POS flow only. Ignore all `v2` folders.

## Goals

1. Make room-charge flow reservation-backed so charges post correctly to folios.
2. Add safe order cancellation to prep station, manage POS sales, and terminal flows.
3. Improve key live UI gaps without touching deprecated `v2` surfaces.

## Guardrails

- Do not change anything under a `v2` folder.
- Do not allow cancellation of delivered orders in this phase.
- Do not let room-service orders proceed without a valid active checked-in reservation.
- Keep `void:pos` as the permission for cancellation.

## Ticket Status Key

- `TODO`: not started
- `DOING`: currently in progress
- `DONE`: completed
- `BLOCKED`: waiting on dependency or decision

## Backend / API

### POS-API-02 Reservation Lookup For Room Charge

Status: DONE

Scope:
- Reuse the live reservations listing API for active checked-in stay lookup.
- Support lookup by room number and/or reservation number.
- Return reservation identity details needed for cashier verification.

Acceptance Criteria:
- Endpoint returns only active checked-in reservations for the hotel.
- Response includes `reservationId`, `reservationNo`, guest name, phone, and room number.
- Invalid or inactive room/reservation lookups return a clear error or empty result.

Implementation Notes:
- Reused existing `GET /reservations` support with `status=CHECKED_IN` and `search`.
- Added frontend hook support so the terminal can query only when actively searching.

### POS-API-03 Require Reservation-Backed Room Service Orders

Status: DONE

Scope:
- Enforce `reservationId` for `ROOM_SERVICE` order creation.
- Keep `roomNo` optional for display context only.

Acceptance Criteria:
- `ROOM_SERVICE` order creation fails without a valid active checked-in `reservationId`.
- Valid room-service orders still create successfully.
- Existing dine-in, takeaway, and retail flows remain unchanged.

### POS-API-01 Shared Cancel Policy And Audit Trail

Status: DONE

Scope:
- Standardize cancellation rules in the live API.
- Add audit metadata for cancellation.

Acceptance Criteria:
- `PENDING`, `PREPARING`, and `READY` orders can be cancelled.
- `DELIVERED` and `CANCELLED` orders cannot be cancelled.
- Routed prep items move to prep status `CANCELLED`.
- Audit log captures order number and cancellation action.

### POS-API-04 Preserve Current Folio Posting Semantics

Status: DONE

Scope:
- Keep folio posting on delivery only.
- Confirm room-service folio posting requires `reservationId`.

Acceptance Criteria:
- Pre-delivery room-service cancellation creates no folio item.
- Delivered room-service with `reservationId` creates exactly one folio item.
- Walk-in delivery still creates invoice behavior as before.

Implementation Notes:
- Confirmed folio posting still happens only when an order is delivered.
- Fixed the delivery path so reservation-backed room-service orders no longer create separate POS invoices.
- Walk-in deliveries continue creating invoices for later payment capture.

## Frontend Screens

### POS-FE-04 Reservation-Backed Room Charge Modal

Status: DONE

Scope:
- Replace raw room-number-only room charge flow in live terminal.
- Require reservation selection/verification before order creation.

Acceptance Criteria:
- Cashier can search by room number or reservation number.
- UI shows guest and reservation identity before confirmation.
- Terminal submits `reservationId` for room-service orders.

### POS-FE-01 Manage POS Sales Cancellation

Status: DONE

Scope:
- Add cancel action to live manage POS sales table/cards.

Acceptance Criteria:
- Eligible orders show cancel action.
- Ineligible orders do not.
- Cancel updates table state without reload.

### POS-FE-02 Prep Station Order Cancellation

Status: DONE

Scope:
- Add order-level cancel action on prep station tickets.

Acceptance Criteria:
- Users with `void:pos` can cancel eligible orders from prep board.
- Cancelled tickets disappear from active queue states.

### POS-FE-03 Terminal Open Order Recovery And Cancellation

Status: DONE

Scope:
- Expose open/live orders on the terminal, not only delivered receipts.
- Add cancel action where allowed.

Acceptance Criteria:
- Terminal can show eligible open orders for recovery.
- Eligible orders can be cancelled from terminal flow.

### POS-FE-06 Terminal Mobile Responsiveness

Status: DONE

Scope:
- Improve the live terminal layout on mobile.

Acceptance Criteria:
- Product area and cart remain usable on narrow screens.
- Core actions stay reachable without horizontal breakage.

Implementation Notes:
- Added a mobile-only products/cart toggle in the live terminal order view.
- Kept the desktop split layout intact for larger screens.
- Added a sticky mobile cart summary CTA so cashiers can jump to totals and checkout quickly.

### OPS-FE-01 Room Detail Mobile Responsiveness

Status: DONE

Implementation Notes:
- Stacked header actions into full-width buttons on narrow screens.
- Relaxed guest, reservation, and booking rows so badges and metadata can wrap cleanly.
- Kept the bookings panel full-width on smaller screens before returning to a split layout on desktop.

### OPS-FE-02 Table Settings Mobile Responsiveness

Status: DONE

Implementation Notes:
- Stacked the page header controls into mobile-friendly full-width actions.
- Converted table rows into compact stacked cards on smaller screens while keeping desktop row behavior.
- Enlarged mobile reorder/action tap targets so the table list stays usable without horizontal squeeze.

### INV-FE-01 Inventory Table Nowrap Cleanup

Status: DONE

Implementation Notes:
- Added `whitespace-nowrap` consistently across inventory body cells that should stay on one line.
- Kept the existing horizontal scroll behavior so dense stock tables stay readable instead of wrapping unpredictably.

### POS-FE-05 Profile Dropdown Username And Email

Status: DONE

Implementation Notes:
- Added a user identity block at the top of the profile dropdown.
- Dropdown now shows display name, username, and email from the live auth store.

## QA Scenarios

### QA-POS-01 Cancel From Manage POS

Status: DONE

Verification Notes:
- Confirmed the manage POS sales table exposes cancellation for eligible live orders only.
- Cancellation routes through the shared modal and backend `cancel()` guardrails.

### QA-POS-02 Cancel From Prep Station

Status: DONE

Verification Notes:
- Confirmed prep tickets expose order-level cancellation behind `void:pos`.
- Backend cancellation marks routed prep items as `CANCELLED` and emits prep sync updates.

### QA-POS-03 Cancel From Terminal

Status: DONE

Verification Notes:
- Confirmed the terminal receipts flow now surfaces open orders and uses the shared cancel modal.
- Delivered orders remain blocked by API rules.

### QA-POS-04 Delivery Side Effects

Status: DONE

Verification Notes:
- Confirmed delivery is the only path that deducts inventory and records stock movements.
- Walk-in payment remains blocked until the order is delivered.

### QA-POS-05 Proper Room-Charge Flow

Status: DONE

Verification Notes:
- Confirmed room-service order creation now requires a checked-in `reservationId`.
- Terminal room-charge flow now requires reservation selection plus reservation number or phone-last-4 confirmation.
- Delivered room-service orders post to folio without creating a separate POS invoice.

### QA-POS-06 Invalid Room-Charge Blocked

Status: DONE

Verification Notes:
- Confirmed API rejects room-service orders without a valid active checked-in reservation.
- Confirmed mismatched room number and reservation combinations are rejected.

### QA-POS-07 Accounting Safety

Status: DONE

Verification Notes:
- Confirmed pre-delivery cancellation creates no folio item, no payment, and no invoice.
- Confirmed delivered room-service now stays on the folio path only, while walk-in orders stay on the invoice path.

### QA-UI-01 Mobile And Layout Checks

Status: BLOCKED

Verification Notes:
- Type-safe implementation checks are complete for terminal, room detail, tables, inventory, and topbar updates.
- A final browser/device pass is still required to visually confirm breakpoints and tap-target behavior.

## Notes

- All planned live POS, API, and responsive UI changes in this tracker are complete.
- The only remaining item is `QA-UI-01`, which requires a real browser/device pass to visually confirm breakpoints and tap targets.
- Current backend only posts folio charges on delivery when `reservationId` is present.
- That means room-charge correctness must be fixed before expanding cancellation across all surfaces.
