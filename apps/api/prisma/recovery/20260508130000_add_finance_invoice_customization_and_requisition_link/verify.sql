-- Confirm removed columns are gone.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'Hotel' AND column_name = 'invoiceTemplateSettings')
    OR (table_name = 'Invoice' AND column_name = 'counterpartyName')
    OR (table_name = 'FacilityRequisition' AND column_name = 'invoiceId')
  );

-- Confirm backup tables exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'Hotel_invoiceTemplateSettings_backup_20260508130000',
    'Invoice_counterpartyName_backup_20260508130000',
    'FacilityRequisition_invoiceLink_backup_20260508130000'
  );

-- Confirm preserved row counts are available for inspection.
SELECT COUNT(*) AS hotel_invoice_template_backup_rows
FROM "Hotel_invoiceTemplateSettings_backup_20260508130000";

SELECT COUNT(*) AS invoice_counterparty_backup_rows
FROM "Invoice_counterpartyName_backup_20260508130000";

SELECT COUNT(*) AS requisition_invoice_link_backup_rows
FROM "FacilityRequisition_invoiceLink_backup_20260508130000";

-- Sample preserved requisition invoice links.
SELECT *
FROM "FacilityRequisition_invoiceLink_backup_20260508130000"
LIMIT 10;
