ALTER TABLE "HrContract"
ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signedByUserId" TEXT,
ADD COLUMN "activatedAt" TIMESTAMP(3);

CREATE INDEX "HrContract_hotelId_signedAt_idx" ON "HrContract"("hotelId", "signedAt");
