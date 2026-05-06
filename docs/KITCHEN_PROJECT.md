# Kitchen and Prep Routing Project

Last updated: 2026-05-05

## Status

Current non-`v2` kitchen and POS bridge work is done.

Implemented in this round:

- prep routing is separated from POS product category
- routed prep items now drive kitchen and bar execution
- dedicated kitchen and bar operational routes are in place
- order readiness is derived from routed item progress
- manage POS sales now bridges `READY -> DELIVERED -> PAID`
- terminal auth/device binding, attendance gate, and payment recovery flow are in place

Remaining ideas such as expeditor/runner-specific flow should be treated as `v2` or later work, not current open scope.

## Goal

Build kitchen and bar operational screens the right way by introducing prep routing that is separate from POS product category, then using that routing to power realtime station-specific production boards.

This project should avoid treating all POS orders as one generic kitchen queue. Instead, food, drinks, and other prep work should be routed to the correct station and updated by the correct staff.

## Why We Need This

Using `posProduct.category` for prep routing is tempting, but category and prep station are not the same concern.

- Category is mainly for reporting, filtering, merchandising, and organization.
- Prep routing is for operational execution.
- Multiple categories may belong to one station.
- One category may eventually need different stations at different hotels.
- Mixed orders with food and drinks break down quickly if we only track one order-level status.

So we should add a second routing layer dedicated to preparation workflow.

## Core Decision

Introduce a dedicated prep routing field, separate from category.

Recommended model:

- `prepStation` on POS product
- optional future `prepStationId` if we want configurable station records per hotel

Recommended initial enum:

- `NONE`
- `KITCHEN`
- `BAR`
- `ROOM_SERVICE`
- `CAFE`
- `PASTRY`

For v1 we can start with:

- `NONE`
- `KITCHEN`
- `BAR`

`NONE` is important for items that should not appear on any prep board:

- bottled retail items
- merchandise
- tray fees
- admin/manual charge lines

## High-Level Product Behavior

### At Order Creation

When a cashier/server creates a POS order:

1. the system creates the order and its order items
2. each order item carries its product's `prepStation`
3. station-specific boards show only the items relevant to that station
4. station staff update production progress from their own board

### At Kitchen/Bar Board Level

Each station board should show:

- only active items for that station
- grouped by production state
- ticket age and urgency
- table, room, or takeaway context
- item notes and modifiers
- only the actions relevant to production staff

### At Order Completion Level

The order should not be considered fully production-ready until all routed prep items are ready.

That means:

- kitchen may finish its food items
- bar may still be preparing drinks
- the full order is only operationally ready when all routed items across all stations are ready

This is the main reason item-level or station-slice status is better than only one order-level status.

## Recommended Data Model

### Product

Add a prep routing field on POS products.

Suggested field:

- `prepStation`

Suggested values:

- `NONE`
- `KITCHEN`
- `BAR`
- `ROOM_SERVICE`
- `CAFE`
- `PASTRY`

Notes:

- keep current category field
- do not overload category with routing logic
- add UI for setting prep station on product create/edit

### Order Item

Add item-level prep tracking.

Suggested fields on `PosOrderItem`:

- `prepStation`
- `prepStatus`
- `prepStartedAt`
- `prepCompletedAt`
- `bumpedAt`
- `bumpedByStaffId`

Suggested `prepStatus` values:

- `QUEUED`
- `IN_PROGRESS`
- `READY`
- `FULFILLED`
- `CANCELLED`

Meaning:

- `QUEUED`: item is waiting at its station
- `IN_PROGRESS`: station has started work
- `READY`: station has finished prep
- `FULFILLED`: item has been handed off or order fully completed
- `CANCELLED`: item was cancelled or voided before fulfilment

If we want to keep naming closer to current order statuses, we can also use:

- `PENDING`
- `PREPARING`
- `READY`
- `DELIVERED`
- `CANCELLED`

But I recommend not coupling station/item lifecycle too tightly to accounting/order lifecycle language. `FULFILLED` is safer than `DELIVERED` at item level.

### Order

Keep current order-level `status`, but evolve its meaning carefully.

Recommended behavior:

- order-level `status` remains for overall commercial flow
- item-level `prepStatus` drives kitchen/bar execution
- order-level readiness is derived from item readiness

Possible derived helpers:

- `isPrepComplete`
- `hasQueuedPrepItems`
- `hasInProgressPrepItems`
- `hasReadyPrepItems`

Longer term, consider adding:

- `serviceStatus`
- `productionStatus`

This keeps payment/accounting concerns separate from prep execution concerns.

## Roles and Permissions

Yes, we should add a `COOK` role.

Current shared roles already include `BARTENDER`, but not `COOK`.

Recommended role additions:

- `COOK`
- optionally later `EXPEDITOR` or `RUNNER`

Recommended permission model:

- `view:pos-kitchen-board`
- `update:pos-kitchen-board`
- `view:pos-bar-board`
- `update:pos-bar-board`

Role defaults:

- `COOK`: kitchen board view/update
- `BARTENDER`: bar board view/update
- `MANAGER`: all board view/update
- `CASHIER`: optional read-only visibility, but no prep updates by default

Important:

- do not hardcode board access only by role
- add role support, but enforce access with permissions

## Recommended Screen Placement

Use dedicated device-style operational routes, not the cashier terminal screen.

Recommended routes:

- `apps/web/src/app/(auth)/kitchen/page.tsx`
- `apps/web/src/app/(auth)/bar/page.tsx`

Possible shared component:

- `apps/web/src/components/pos/PrepStationBoard.tsx`

Why this is better than putting it inside `terminal/page.tsx`:

- terminal is already a cashier/server workflow
- kitchen/bar need full-screen production-first interfaces
- device authentication and permissions can stay separate
- we avoid mixing payment/cart actions with prep actions

## Kitchen Board  - take queue from housekeeping/page.tsx if neede

### Layout

Recommended default:

- Kanban-style columns

Columns:

1. `Queued`
2. `Preparing`
3. `Ready`

Optional later:

4. `Fulfilled`

Recommended card contents:

- order number
- table number / room number / takeaway tag
- created time
- elapsed time
- item list for that station only
- notes/modifiers
- who entered the order if useful

Recommended interactions:

- one-tap move to next state
- optional move backward for corrections
- visible urgency styling based on age

### Actions

Kitchen board should usually allow:

- `Queued -> Preparing`
- `Preparing -> Ready`

Optional:

- `Ready -> Fulfilled`

Recommendation:

- kitchen stops at `Ready`
- service runner / cashier / expediter handles final handoff if your operation separates prep from delivery

If a hotel wants kitchen to own final dispatch, we can enable `Fulfilled` there too.

Implemented bridge:

- kitchen/bar boards currently drive prep to `Ready`
- manager/cashier sales surfaces now expose `Mark delivered` for `READY` orders
- manager/cashier sales surfaces also expose `Continue payment` for unpaid walk-in orders
- if `Continue payment` is used on a `READY` order, the system first marks the order `DELIVERED`, then records payment

This keeps production ownership on the prep boards while still giving service/cashier staff a clear post-prep action path.

## Bar Board UX

Bar board should work the same way as kitchen, but only for `BAR` items.

This becomes especially important for mixed orders:

- burger goes to kitchen
- beer goes to bar
- each station sees only what it needs

## Mixed-Order Edge Cases

This is the most important section in the whole design.

### One Order, Multiple Stations

Example:

- Order #1042
- 1 burger -> `KITCHEN`
- 2 cocktails -> `BAR`

Expected behavior:

- kitchen board shows burger only
- bar board shows cocktails only
- each station updates only its own items
- order is not globally ready until both station slices are ready

### Stationless Items

Example:

- bottled water marked `NONE`
- souvenir marked `NONE`

Expected behavior:

- item does not appear on any prep board
- item should not block prep readiness
- order can still complete correctly

### Room Service Orders

Possible approaches:

1. route items to normal prep stations and keep room service only as fulfilment context
2. add `ROOM_SERVICE` as a real prep station if room-service prep is physically separate

Recommendation:

- start with room service as context, not a separate station, unless operations actually prep in a separate area

### Cancelled Items After Prep Starts

Expected behavior:

- cancelled items disappear from active queues
- audit should preserve who cancelled and when
- cancelled items should not block order readiness

### Re-fired or Re-opened Items

Sometimes a guest sends food back or a drink needs to be remade.

Expected behavior:

- item can be cloned or reset to `QUEUED`
- original audit trail stays intact
- remake should be visible as a new prep event or clearly marked retry

### Partial Ready Orders

Expected behavior:

- if kitchen is ready but bar is not, the order should show partial readiness at manager/service surfaces
- station boards should not need to understand the full order beyond their own slice

## Realtime Event Strategy

The current `pos.orders.sync` event is a good base, but it is not enough on its own for item-level prep routing.

We should add station-aware realtime events.

Recommended event family:

- `pos.prep.sync`

Suggested payload:

- hotelId
- orderId
- orderNo
- orderItemId
- prepStation
- prepStatus
- action
- tableNo
- roomNo
- ticketSummary metadata
- timestamp

Actions:

- `queued`
- `started`
- `ready`
- `fulfilled`
- `cancelled`
- `rerouted`
- `refired`

The kitchen/bar UIs should subscribe to this event and update instantly.

We may still keep `pos.orders.sync` for broader order-level invalidation and manager dashboards.

## Backend Implementation Plan

### Phase 1: Data and Domain

1. add `COOK` role to shared types, backend enums, seed data, and permission defaults
2. add `prepStation` to POS products
3. add `prepStatus` and related prep metadata to order items
4. backfill existing products with sensible defaults
5. make order creation copy product `prepStation` onto order items

### Phase 2: API

1. add APIs or service methods for station board queries
2. add mutation endpoints for item prep status transitions
3. add server-side derived helpers for:
   - station queue counts
   - ticket age buckets
   - order prep completeness
4. emit `pos.prep.sync` realtime events on each mutation

### Phase 3: Permissions

1. add new permissions for kitchen/bar board access
2. wire `COOK` and `BARTENDER` role defaults
3. add permission guards on new routes and endpoints

### Phase 4: Web UI

1. build `/(auth)/kitchen/page.tsx`
2. build `/(auth)/bar/page.tsx`
3. build shared board/ticket components
4. subscribe to realtime prep events
5. optimize for touch-first usage on mounted screens

### Phase 5: Manager Visibility

1. expose aggregate prep status in POS manager screens
2. show delayed tickets and station bottlenecks
3. optionally show combined order readiness

## Frontend Query Design

Recommended hooks:

- `usePrepBoard(station)`
- `useUpdatePrepItemStatus(itemId)`
- `usePrepRealtime(station)`

Recommended query scope:

- active tickets only by default
- include only station-relevant items
- avoid sending the full irrelevant order shape when possible

Recommended filtering:

- `station=KITCHEN`
- `status=QUEUED|IN_PROGRESS|READY`

## Ticket Grouping Recommendation

Do not group kitchen/bar boards by the current order-level status.

Group by item or station-slice prep status instead.

Recommended visible columns:

- `Queued`
- `Preparing`
- `Ready`

Manager views can still display order-level `PENDING / PREPARING / READY / DELIVERED`, but station production boards should be item/station-driven.

## Best Operational Flow

Recommended end-to-end flow:

1. cashier creates order
2. each order item inherits prep station from product
3. kitchen and bar boards receive realtime queue updates
4. kitchen/bar staff move items through prep states
5. when all routed items are `READY`, order becomes prep-complete
6. runner/server/cashier hands off items
7. order is marked fully completed at the appropriate final step

Current implemented interpretation:

- station boards own `Queued -> Preparing -> Ready`
- service/cashier surfaces own `Ready -> Delivered`
- payment for walk-in orders is completed after `Delivered`, or via a sales-side shortcut that performs `Delivered` and payment in sequence

This keeps production, handoff, payment, and accounting responsibilities from collapsing into one ambiguous status.

## Rollout Recommendation

### V1

- add prep routing field on products
- add item-level prep status
- add `COOK` role
- build kitchen board
- build bar board
- realtime station updates

### V2

- manager station analytics
- delayed ticket alerts
- expeditor or runner role
- refire/remake flows
- configurable stations per hotel

### V3

- station configuration UI
- station printers / ticketing integration
- sound/alert preferences by station
- production SLA reporting

## Open Questions to Resolve Before Build

1. Should kitchen be allowed to mark items fully fulfilled, or stop at ready?
2. Should bar and kitchen use identical UX, or should bar be more compact and batch-oriented?
3. Do we want fixed enum-based stations first, or configurable station records from day one?
4. Should order-level `status` be derived more strictly from prep and payment state over time?
5. Do room-service-only operations need a dedicated board, or just kitchen/bar context labels?

## Final Recommendation

Build this on item-level prep routing, not category-driven order-level status.

The most correct near-term path is:

- add `prepStation` on products
- add `prepStatus` on order items
- add `COOK` role and permissions
- build dedicated `kitchen` and `bar` device routes
- use realtime prep events for instant updates

That gives us a clean foundation for real hospitality operations and avoids a fragile kitchen-only shortcut that would break as soon as mixed food and drink orders become common.
