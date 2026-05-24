DO $$
BEGIN
  CREATE TYPE "KeycardStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'LOST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KeycardType" AS ENUM ('PHYSICAL', 'MOBILE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KeycardAccessResult" AS ENUM ('GRANTED', 'DENIED', 'EXPIRED', 'REVOKED', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KeycardAccessMethod" AS ENUM ('RFID', 'NFC', 'BLE', 'MANUAL', 'VENDOR_SYNC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Hotel"
ADD COLUMN "lockVendor" TEXT,
ADD COLUMN "lockApiKey" TEXT,
ADD COLUMN "lockApiConfig" JSONB;

ALTER TABLE "Room"
ADD COLUMN "lockDeviceId" TEXT,
ADD COLUMN "lockVendor" TEXT;

CREATE TABLE "Keycard" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "guestId" TEXT,
  "cardUid" TEXT,
  "accessToken" TEXT NOT NULL,
  "type" "KeycardType" NOT NULL DEFAULT 'PHYSICAL',
  "status" "KeycardStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  "issuedByStaffId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Keycard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KeycardAccessLog" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT,
  "keycardId" TEXT,
  "roomId" TEXT,
  "accessToken" TEXT NOT NULL,
  "result" "KeycardAccessResult" NOT NULL,
  "reason" TEXT,
  "method" "KeycardAccessMethod" NOT NULL,
  "deviceId" TEXT,
  "vendorEventId" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KeycardAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Keycard_accessToken_key" ON "Keycard"("accessToken");
CREATE INDEX "Keycard_hotelId_idx" ON "Keycard"("hotelId");
CREATE INDEX "Keycard_reservationId_idx" ON "Keycard"("reservationId");
CREATE INDEX "Keycard_roomId_idx" ON "Keycard"("roomId");
CREATE INDEX "Keycard_guestId_idx" ON "Keycard"("guestId");
CREATE INDEX "Keycard_status_validUntil_idx" ON "Keycard"("status", "validUntil");

CREATE INDEX "KeycardAccessLog_hotelId_createdAt_idx" ON "KeycardAccessLog"("hotelId", "createdAt");
CREATE INDEX "KeycardAccessLog_keycardId_idx" ON "KeycardAccessLog"("keycardId");
CREATE INDEX "KeycardAccessLog_roomId_createdAt_idx" ON "KeycardAccessLog"("roomId", "createdAt");
CREATE INDEX "KeycardAccessLog_accessToken_idx" ON "KeycardAccessLog"("accessToken");

ALTER TABLE "Keycard"
ADD CONSTRAINT "Keycard_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Keycard"
ADD CONSTRAINT "Keycard_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Keycard"
ADD CONSTRAINT "Keycard_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Keycard"
ADD CONSTRAINT "Keycard_guestId_fkey"
FOREIGN KEY ("guestId") REFERENCES "Guest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KeycardAccessLog"
ADD CONSTRAINT "KeycardAccessLog_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KeycardAccessLog"
ADD CONSTRAINT "KeycardAccessLog_keycardId_fkey"
FOREIGN KEY ("keycardId") REFERENCES "Keycard"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KeycardAccessLog"
ADD CONSTRAINT "KeycardAccessLog_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
