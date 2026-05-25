CREATE TABLE "StaffShiftOverride" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "shiftTemplateId" TEXT NOT NULL,
  "dateFrom" TIMESTAMP(3) NOT NULL,
  "dateTo" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StaffShiftOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StaffShiftOverride"
ADD CONSTRAINT "StaffShiftOverride_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffShiftOverride"
ADD CONSTRAINT "StaffShiftOverride_staffId_fkey"
FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffShiftOverride"
ADD CONSTRAINT "StaffShiftOverride_shiftTemplateId_fkey"
FOREIGN KEY ("shiftTemplateId") REFERENCES "ShiftTemplate"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StaffShiftOverride_hotelId_staffId_dateFrom_dateTo_idx"
ON "StaffShiftOverride"("hotelId", "staffId", "dateFrom", "dateTo");

CREATE INDEX "StaffShiftOverride_hotelId_shiftTemplateId_idx"
ON "StaffShiftOverride"("hotelId", "shiftTemplateId");
