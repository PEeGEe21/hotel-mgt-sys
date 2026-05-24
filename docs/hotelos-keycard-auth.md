# HotelOS Keycard Authentication — Current-System Aligned Implementation Guide

## Overview

This document describes how keycard authentication should be implemented in HotelOS based on the system as it exists today.

It is intentionally aligned to the current product direction:

- guest identity is anchored to reservations, not just rooms
- sensitive in-stay operations now rely on active `CHECKED_IN` reservations
- tenant operational UI lives in `apps/web`
- platform oversight can be added later in `apps/admin`
- vendor integration should be pluggable, but the first software phase must work without hardware

This guide covers:

- schema direction
- service architecture
- realistic API shape
- lifecycle hooks
- app placement
- phased rollout

## Current-System Alignment

Before implementation, these are the rules we should treat as non-negotiable because they match the current product better than a room-only model:

- keycards should be tied to `reservationId`
- room access should be valid for the active stay, not for the room permanently
- guest-facing access should be activated on `CHECKED_IN`
- checkout should revoke all active credentials for that reservation
- room number can remain useful display context, but reservation identity is the real authority

This matches the direction already used in the current room-charge flow and POS protections, where active checked-in reservations are required for in-stay guest actions.

## How It Works

Keycard auth in HotelOS should have three layers:

- **HotelOS** — owns credential records, lifecycle, validity windows, revocation, and auditability
- **Lock vendor integration** — provisions or revokes credentials with the hotel’s chosen lock ecosystem
- **Physical lock / mobile unlock layer** — actual door access hardware or vendor mobile SDK

HotelOS should not depend on one lock brand. It should use a provider interface so each hotel tenant can use its own supported vendor.

## Important Constraint

Not every vendor supports live server-side verification on every door tap.

So we should split the concept of “verification” into two modes:

1. **Provisioning mode**
- HotelOS issues or revokes credentials with the vendor
- the lock validates access offline or within the vendor ecosystem

2. **Audit ingestion mode**
- HotelOS receives access events through vendor callbacks, sync jobs, or a mock/local flow
- this is for audit and diagnostics, not necessarily real-time door allow/deny decisions

That means the first version should not assume every lock tap calls HotelOS directly.

## Vendor Landscape

| Vendor | Type | Notes |
|---|---|---|
| **VingCard (ASSA ABLOY)** | RFID keycard | Common in larger hotels |
| **Dormakaba (Saflok)** | RFID keycard | Common in hotel chains |
| **Salto Systems** | RFID + mobile | Strong API/mobile ecosystem |
| **Onity** | RFID keycard | Common in budget/mid-tier properties |
| **TTLock** | RFID + BLE + fingerprint | Accessible for smaller deployments and pilot integrations |

Recommendation:

- do not hardcode one vendor
- support `MOCK` first for local development
- add one real provider only after the software workflow is stable

## Schema Direction

The current schema already has the right base entities:

- `Hotel`
- `Room`
- `Reservation`
- `Guest`
- `ReservationGuest`

We should extend those rather than inventing a parallel identity system.

## New Enums

```prisma
enum KeycardStatus {
  ACTIVE
  EXPIRED
  REVOKED
  LOST
}

enum KeycardType {
  PHYSICAL
  MOBILE
}

enum KeycardAccessResult {
  GRANTED
  DENIED
  EXPIRED
  REVOKED
  UNKNOWN
}

enum KeycardAccessMethod {
  RFID
  NFC
  BLE
  MANUAL
  VENDOR_SYNC
}
```

## New Models

```prisma
model Keycard {
  id              String         @id @default(uuid())
  hotelId         String
  reservationId   String
  roomId          String
  guestId         String?
  cardUid         String?
  accessToken     String         @unique
  type            KeycardType    @default(PHYSICAL)
  status          KeycardStatus  @default(ACTIVE)
  issuedAt        DateTime       @default(now())
  validFrom       DateTime
  validUntil      DateTime
  revokedAt       DateTime?
  revokedReason   String?
  issuedByStaffId String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  hotel       Hotel             @relation(fields: [hotelId], references: [id])
  reservation Reservation       @relation(fields: [reservationId], references: [id])
  room        Room              @relation(fields: [roomId], references: [id])
  guest       Guest?            @relation(fields: [guestId], references: [id])
  accessLogs  KeycardAccessLog[]

  @@index([hotelId])
  @@index([reservationId])
  @@index([roomId])
  @@index([guestId])
  @@index([status, validUntil])
}

model KeycardAccessLog {
  id             String              @id @default(uuid())
  hotelId        String?
  keycardId      String?
  roomId         String?
  accessToken    String
  result         KeycardAccessResult
  reason         String?
  method         KeycardAccessMethod
  deviceId       String?
  vendorEventId  String?
  ipAddress      String?
  createdAt      DateTime            @default(now())

  hotel   Hotel?   @relation(fields: [hotelId], references: [id])
  keycard Keycard? @relation(fields: [keycardId], references: [id])
  room    Room?    @relation(fields: [roomId], references: [id])

  @@index([hotelId, createdAt])
  @@index([keycardId])
  @@index([roomId, createdAt])
  @@index([accessToken])
}
```

## Why This Shape Matches The Current System Better

- `reservationId` is required because access belongs to a stay
- `guestId` stays optional because some cards may be stay-level rather than assigned to a specific guest
- `KeycardAccessLog` foreign keys are nullable so unknown/invalid-token attempts can still be recorded
- `KeycardType` and result/method enums are explicit rather than loose strings

## Updates To Existing Models

```prisma
// Hotel
lockVendor    String?
lockApiKey    String?
lockApiConfig Json?

// Room
lockDeviceId String?
lockVendor   String?
keycards     Keycard[]
accessLogs   KeycardAccessLog[]

// Reservation
keycards Keycard[]

// Guest
keycards Keycard[]
```

## Reservation Guest Handling

The live schema already supports multiple guests per reservation through `ReservationGuest`.

That means the implementation should support:

- one primary guest card
- one or more additional guest cards
- unassigned room/stay card if the hotel workflow needs it

Recommended rule:

- each issued credential belongs to one reservation
- it may optionally belong to one guest on that reservation

This avoids forcing every card into a primary-guest-only model.

## Lifecycle Rules

## Activation Trigger

Guest room keys should not be treated as fully active on `CONFIRMED` alone.

Recommended live-system-aligned behavior:

- reservation may be prepared before arrival
- key may be pre-issued internally
- card becomes usable only when reservation is `CHECKED_IN`
- `validFrom` should normally be the actual check-in timestamp

This aligns better with the current product, where active-stay actions are tied to checked-in reservations.

## Revocation Trigger

Revoke all active reservation keycards when:

- guest checks out
- reservation is cancelled before stay
- room move invalidates room-specific credentials
- card is reported lost

## Room Move Rule

If a checked-in reservation changes rooms:

- old room credentials should be revoked
- new room credentials should be issued against the same reservation

This is another reason reservation-based identity is correct.

## Service Architecture

## Lock Provider Interface

HotelOS should depend on a provider abstraction, not a vendor directly.

```ts
export interface IssueKeyParams {
  accessToken: string;
  lockDeviceId: string;
  validFrom: Date;
  validUntil: Date;
  guestName?: string;
}

export interface AccessResult {
  granted: boolean;
  reason?: string;
}

export interface LockProvider {
  issueKey(params: IssueKeyParams): Promise<void>;
  revokeKey(accessToken: string, lockDeviceId: string): Promise<void>;
  pullAccessLogs?(args: {
    hotelId: string;
    from?: Date;
    to?: Date;
  }): Promise<Array<{
    accessToken: string;
    deviceId?: string;
    occurredAt: Date;
    granted: boolean;
    reason?: string;
    vendorEventId?: string;
  }>>;
}
```

## Mock Provider First

The first real build phase should use `MockLockProvider` so we can validate:

- issuance
- revocation
- reservation lifecycle hooks
- access logging

without hardware procurement.

## Keycard Service Responsibilities

The service should:

- validate reservation belongs to hotel
- require active or activating reservation context
- validate room belongs to reservation
- optionally validate guest belongs to reservation
- generate cryptographically strong credential token
- create DB record
- provision vendor credential if a real lock vendor is configured
- revoke on demand
- revoke all for reservation
- ingest access events

## Current-System-Aligned Pseudocode

```ts
async issueKeycard(hotelId: string, dto: IssueKeycardDto, issuedByStaffId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: dto.reservationId, hotelId },
    include: {
      room: true,
      guests: true,
      guest: true,
    },
  });

  if (!reservation) throw new NotFoundException('Reservation not found.');

  if (!['CHECKED_IN', 'CONFIRMED'].includes(reservation.status)) {
    throw new BadRequestException('Keycards can only be prepared for confirmed stays or issued to checked-in stays.');
  }

  if (reservation.roomId !== dto.roomId) {
    throw new BadRequestException('Room does not match reservation.');
  }

  if (dto.guestId) {
    const guestAllowed =
      reservation.guestId === dto.guestId ||
      reservation.guests.some((entry) => entry.guestId === dto.guestId);
    if (!guestAllowed) {
      throw new BadRequestException('Guest is not attached to this reservation.');
    }
  }

  const accessToken = crypto.randomBytes(32).toString('hex');
  const validFrom =
    reservation.status === 'CHECKED_IN' ? new Date() : dto.validFrom ?? reservation.checkIn;
  const validUntil = dto.validUntil ?? reservation.checkOut;

  const keycard = await prisma.keycard.create({
    data: {
      hotelId,
      reservationId: reservation.id,
      roomId: reservation.roomId,
      guestId: dto.guestId,
      cardUid: dto.cardUid ?? null,
      accessToken,
      type: dto.type ?? 'PHYSICAL',
      validFrom,
      validUntil,
      issuedByStaffId,
    },
  });

  return keycard;
}
```

## Access Logging

The service should support two audit patterns:

### 1. Local/mock verification

Useful for phase 1 and testing.

### 2. Vendor log ingestion

Useful for real deployments where the lock ecosystem records actual access.

The key point is:

- logging denied or unknown access attempts must not fail because a foreign key is missing

So unknown-token events should still create `KeycardAccessLog` rows with nullable references.

## API Shape

The live API style should derive `hotelId` from auth/session context, not trust it from tenant request bodies.

## Recommended Endpoints

```text
POST   /api/v1/keycards/issue
GET    /api/v1/keycards/reservation/:id
PATCH  /api/v1/keycards/:id/revoke
POST   /api/v1/keycards/ingest-access-event
GET    /api/v1/keycards/:id/logs
```

Optional later:

```text
POST   /api/v1/keycards/:id/report-lost
POST   /api/v1/keycards/reservation/:id/revoke-all
```

## Issue Request Body

```ts
{
  reservationId: string;
  roomId: string;
  guestId?: string;
  cardUid?: string;
  validFrom?: string;
  validUntil?: string;
  type?: 'PHYSICAL' | 'MOBILE';
}
```

Note:

- no tenant-supplied `hotelId`

## Access Event Ingest Request

```ts
{
  accessToken: string;
  deviceId?: string;
  result?: 'GRANTED' | 'DENIED';
  reason?: string;
  method?: 'RFID' | 'NFC' | 'BLE' | 'MANUAL' | 'VENDOR_SYNC';
  occurredAt?: string;
  vendorEventId?: string;
}
```

This is a better fit than pretending every physical tap directly asks HotelOS for permission.

## App Placement

## In `apps/web`

This is where the first operational UI should live.

### 1. Reservation Detail

Add keycard management to:

- `apps/web/src/app/(dashboard)/reservations/[id]/page.tsx`

This is the main hotel-staff surface for:

- issue keycard
- list active/resolved keycards
- revoke keycard
- mark lost
- show validity window

Why here:

- reservation is the real identity anchor
- this is where check-in/check-out context already exists

### 2. Room Detail

Add room lock metadata visibility to:

- `apps/web/src/app/(dashboard)/rooms/[id]/page.tsx`

Use this for:

- view `lockDeviceId`
- show current room lock status/config
- show current active reservation keycards indirectly

### 3. Hotel Settings

Add vendor-level lock configuration to:

- `apps/web/src/app/(dashboard)/settings/hotel/page.tsx`

Use this for:

- hotel lock vendor
- hotel vendor API config
- default keycard behavior flags later

### 4. Room Setup / Room Admin

Add per-room lock mapping to room management surfaces:

- room create/edit flows
- room detail page

Use this for:

- `lockDeviceId`
- room-level vendor override if ever needed

## In `apps/api`

Recommended module:

- `apps/api/src/modules/keycards`

Suggested contents:

- `keycards.module.ts`
- `controllers/keycards.controller.ts`
- `services/keycards.service.ts`
- `providers/mock-lock.provider.ts`
- `providers/ttlock.provider.ts`
- `keycard-provider.factory.ts`
- `dtos/*`

## In `apps/admin`

This is not required for phase 1.

Later platform oversight can show:

- which hotels have lock integrations configured
- which hotels use mock vs real vendor
- support-level access to keycard audit summaries

But tenant operations should begin in `apps/web`, not `apps/admin`.

## Checkout Hook

This needs to be wired into the real reservation checkout path.

Current checkout service location:

- `apps/api/src/modules/reservations/services/reservations.service.ts`

Recommended hook:

```ts
await this.keycardService.revokeAllForReservation(reservationId);
```

This should happen as part of successful checkout finalization, not as a separate manual expectation.

## Permissions

These keys do not exist yet, but they are a reasonable fit for the current permission model:

```text
keycard:issue
keycard:revoke
keycard:view-logs
keycard:manage-devices
```

Recommended role direction:

- `ADMIN`: issue, revoke, view logs, manage devices
- `MANAGER`: issue, revoke, view logs
- `RECEPTIONIST`: issue, maybe revoke depending on policy
- everyone else: no default keycard permissions

## Phase Plan

## Phase 1 — Software Layer Only

Build:

- Prisma schema
- `KeycardService`
- `MockLockProvider`
- issue/list/revoke endpoints
- access-log ingest endpoint
- reservation detail UI in `apps/web`
- checkout auto-revoke hook

Do not assume hardware yet.

## Phase 2 — Live Vendor Integration

Build:

- one real provider, preferably after field validation with a real hotel
- hotel-level lock config in settings
- room-level lock-device mapping
- end-to-end issue/revoke flow with one vendor

Recommended first real provider:

- whichever vendor the pilot hotel actually uses

## Phase 3 — Mobile Key

Build:

- `MOBILE` key type
- guest mobile credential delivery
- vendor mobile SDK integration
- optional QR/deep-link handoff if vendor supports it

Important note:

- mobile key support depends heavily on vendor SDK capability
- it should not be designed as a generic HotelOS BLE stack

## Non-Goals For Phase 1

- fingerprint or biometric access
- shared amenity multi-door access control
- full guest mobile app
- cross-vendor normalized real-time unlock protocol
- platform-admin keycard operations as a primary workflow

## Recommended Next Step

Start with:

1. Prisma schema
2. `apps/api/src/modules/keycards`
3. reservation detail UI in `apps/web`
4. checkout auto-revoke hook
5. `MockLockProvider`

That gives us a full reservation-backed software workflow that matches the current system before any hardware commitment.
