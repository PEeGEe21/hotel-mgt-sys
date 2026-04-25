CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "providerMessageId" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDeliveryLog_hotelId_createdAt_idx" ON "EmailDeliveryLog"("hotelId", "createdAt");
CREATE INDEX "EmailDeliveryLog_status_createdAt_idx" ON "EmailDeliveryLog"("status", "createdAt");
CREATE INDEX "EmailDeliveryLog_event_createdAt_idx" ON "EmailDeliveryLog"("event", "createdAt");
CREATE INDEX "EmailDeliveryLog_recipient_createdAt_idx" ON "EmailDeliveryLog"("recipient", "createdAt");

ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
