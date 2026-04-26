-- Add generic run-status tracking for per-hotel scheduled jobs
ALTER TABLE "HotelCronSetting"
ADD COLUMN "lastSucceededAt" TIMESTAMP(3),
ADD COLUMN "lastFailedAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT;
