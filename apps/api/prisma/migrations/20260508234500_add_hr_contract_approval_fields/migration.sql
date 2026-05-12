ALTER TABLE "HrContract"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "submittedByUserId" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "approvalComment" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedByUserId" TEXT,
ADD COLUMN "rejectionReason" TEXT;

CREATE INDEX "HrContract_hotelId_submittedAt_idx"
ON "HrContract"("hotelId", "submittedAt");

CREATE INDEX "HrContract_hotelId_approvedAt_idx"
ON "HrContract"("hotelId", "approvedAt");
