CREATE TABLE "HrContractAuditLog" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HrContractAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HrContractAuditLog_hotelId_contractId_createdAt_idx"
ON "HrContractAuditLog"("hotelId", "contractId", "createdAt");

CREATE INDEX "HrContractAuditLog_contractId_idx"
ON "HrContractAuditLog"("contractId");

ALTER TABLE "HrContractAuditLog"
ADD CONSTRAINT "HrContractAuditLog_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HrContractAuditLog"
ADD CONSTRAINT "HrContractAuditLog_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "HrContract"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
