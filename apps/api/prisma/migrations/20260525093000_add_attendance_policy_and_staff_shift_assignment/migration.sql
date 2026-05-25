ALTER TABLE "Hotel"
ADD COLUMN "attendanceAutoClockOutEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "attendanceAutoClockOutHour" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "attendanceAutoClockOutMinute" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Staff"
ADD COLUMN "shiftTemplateId" TEXT;

ALTER TABLE "Staff"
ADD CONSTRAINT "Staff_shiftTemplateId_fkey"
FOREIGN KEY ("shiftTemplateId") REFERENCES "ShiftTemplate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Staff_hotelId_shiftTemplateId_idx" ON "Staff"("hotelId", "shiftTemplateId");
