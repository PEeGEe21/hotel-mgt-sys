BEGIN;

-- Preserve hotel invoice appearance settings before removing the column.
CREATE TABLE IF NOT EXISTS "Hotel_invoiceTemplateSettings_backup_20260508130000" AS
SELECT
  "id" AS "hotelId",
  "invoiceTemplateSettings"
FROM "Hotel"
WHERE "invoiceTemplateSettings" IS NOT NULL;

-- Preserve invoice counterparty names before removing the column.
CREATE TABLE IF NOT EXISTS "Invoice_counterpartyName_backup_20260508130000" AS
SELECT
  "id" AS "invoiceId",
  "hotelId",
  "invoiceNo",
  "counterpartyName"
FROM "Invoice"
WHERE "counterpartyName" IS NOT NULL;

-- Preserve requisition invoice links before removing the relationship column.
CREATE TABLE IF NOT EXISTS "FacilityRequisition_invoiceLink_backup_20260508130000" AS
SELECT
  "id" AS "facilityRequisitionId",
  "hotelId",
  "invoiceId"
FROM "FacilityRequisition"
WHERE "invoiceId" IS NOT NULL;

ALTER TABLE "FacilityRequisition"
DROP CONSTRAINT IF EXISTS "FacilityRequisition_invoiceId_fkey";

DROP INDEX IF EXISTS "FacilityRequisition_invoiceId_key";

ALTER TABLE "FacilityRequisition"
DROP COLUMN IF EXISTS "invoiceId";

ALTER TABLE "Invoice"
DROP COLUMN IF EXISTS "counterpartyName";

ALTER TABLE "Hotel"
DROP COLUMN IF EXISTS "invoiceTemplateSettings";

COMMIT;
