CREATE TABLE "RealtimeModuleHealth" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "lastEventAt" TIMESTAMP(3) NOT NULL,
  "lastEventType" TEXT,
  "lastSummary" TEXT,
  "eventCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RealtimeModuleHealth_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RealtimeEventLog" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RealtimeEventLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RealtimeModuleHealth_hotelId_moduleKey_key"
ON "RealtimeModuleHealth"("hotelId", "moduleKey");

CREATE INDEX "RealtimeModuleHealth_hotelId_lastEventAt_idx"
ON "RealtimeModuleHealth"("hotelId", "lastEventAt");

CREATE INDEX "RealtimeModuleHealth_moduleKey_idx"
ON "RealtimeModuleHealth"("moduleKey");

CREATE INDEX "RealtimeEventLog_hotelId_createdAt_idx"
ON "RealtimeEventLog"("hotelId", "createdAt");

CREATE INDEX "RealtimeEventLog_hotelId_moduleKey_createdAt_idx"
ON "RealtimeEventLog"("hotelId", "moduleKey", "createdAt");

ALTER TABLE "RealtimeModuleHealth"
ADD CONSTRAINT "RealtimeModuleHealth_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RealtimeEventLog"
ADD CONSTRAINT "RealtimeEventLog_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
