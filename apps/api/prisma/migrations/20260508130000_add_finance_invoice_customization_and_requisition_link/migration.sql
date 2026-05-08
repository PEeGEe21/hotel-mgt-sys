ALTER TABLE "Hotel"
ADD COLUMN "invoiceTemplateSettings" JSONB;

ALTER TABLE "Invoice"
ADD COLUMN "counterpartyName" TEXT;

ALTER TABLE "FacilityRequisition"
ADD COLUMN "invoiceId" TEXT;

CREATE UNIQUE INDEX "FacilityRequisition_invoiceId_key" ON "FacilityRequisition"("invoiceId");

ALTER TABLE "FacilityRequisition"
ADD CONSTRAINT "FacilityRequisition_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
