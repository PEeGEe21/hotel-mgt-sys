ALTER TABLE "HrContract"
ADD COLUMN "terminationDate" TIMESTAMP(3),
ADD COLUMN "terminationReason" TEXT,
ADD COLUMN "terminatedByUserId" TEXT;

CREATE INDEX "HrContract_hotelId_terminationDate_idx"
ON "HrContract"("hotelId", "terminationDate");
