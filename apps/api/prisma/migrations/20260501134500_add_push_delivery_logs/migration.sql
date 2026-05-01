ALTER TABLE "PushSubscription"
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN "lastFailureAt" TIMESTAMP(3),
ADD COLUMN "lastFailureReason" TEXT,
ADD COLUMN "lastFailureStatusCode" INTEGER,
ADD COLUMN "lastDeliveredEvent" TEXT;

CREATE TABLE "PushDeliveryLog" (
    "id" TEXT NOT NULL,
    "pushSubscriptionId" TEXT,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT,
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "failureStatusCode" INTEGER,
    "endpoint" TEXT NOT NULL,
    "correlationId" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PushDeliveryLog_userId_createdAt_idx" ON "PushDeliveryLog"("userId", "createdAt");
CREATE INDEX "PushDeliveryLog_hotelId_createdAt_idx" ON "PushDeliveryLog"("hotelId", "createdAt");
CREATE INDEX "PushDeliveryLog_status_createdAt_idx" ON "PushDeliveryLog"("status", "createdAt");
CREATE INDEX "PushDeliveryLog_pushSubscriptionId_idx" ON "PushDeliveryLog"("pushSubscriptionId");

ALTER TABLE "PushDeliveryLog"
ADD CONSTRAINT "PushDeliveryLog_pushSubscriptionId_fkey"
FOREIGN KEY ("pushSubscriptionId") REFERENCES "PushSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PushDeliveryLog"
ADD CONSTRAINT "PushDeliveryLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushDeliveryLog"
ADD CONSTRAINT "PushDeliveryLog_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
