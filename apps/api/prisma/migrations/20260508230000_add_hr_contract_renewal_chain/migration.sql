ALTER TABLE "HrContract"
ADD COLUMN "renewedFromContractId" TEXT;

CREATE INDEX "HrContract_renewedFromContractId_idx"
ON "HrContract"("renewedFromContractId");

ALTER TABLE "HrContract"
ADD CONSTRAINT "HrContract_renewedFromContractId_fkey"
FOREIGN KEY ("renewedFromContractId") REFERENCES "HrContract"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
