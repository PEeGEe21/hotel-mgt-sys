CREATE TYPE "HotelCronJobType" AS ENUM ('ATTENDANCE_ABSENCE_SCAN');

CREATE TABLE "HotelCronSetting" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "jobType" "HotelCronJobType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "runAtHour" INTEGER NOT NULL DEFAULT 9,
    "runAtMinute" INTEGER NOT NULL DEFAULT 15,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelCronSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelCronSetting_hotelId_jobType_key" ON "HotelCronSetting"("hotelId", "jobType");
CREATE INDEX "HotelCronSetting_jobType_enabled_idx" ON "HotelCronSetting"("jobType", "enabled");
CREATE INDEX "HotelCronSetting_hotelId_idx" ON "HotelCronSetting"("hotelId");

ALTER TABLE "HotelCronSetting" ADD CONSTRAINT "HotelCronSetting_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
