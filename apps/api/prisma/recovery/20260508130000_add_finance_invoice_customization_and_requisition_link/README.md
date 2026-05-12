# Recovery: `20260508130000_add_finance_invoice_customization_and_requisition_link`

## Migration

- migration name: `20260508130000_add_finance_invoice_customization_and_requisition_link`
- primary tables:
  - `Hotel`
  - `Invoice`
  - `FacilityRequisition`

## What Changed

This migration introduced:

- `Hotel.invoiceTemplateSettings`
- `Invoice.counterpartyName`
- `FacilityRequisition.invoiceId`
- unique index and foreign key for requisition-to-invoice linkage

These changes support:

- per-hotel printable invoice appearance settings
- explicit invoice counterparty labeling
- approved requisitions linking directly to generated expense invoices

## Risk Summary

- migration type: additive
- primary risk:
  - runtime/schema mismatch if finance flows expect the new columns and link
  - loss of invoice template settings or requisition invoice linkage if rollback removes columns without preserving data
- app rollback alone is preferred if:
  - the prior application version can safely ignore the added columns
  - the issue is application logic rather than schema integrity
- schema rollback is only needed if:
  - the migration itself causes production issues
  - the application stack must return to a pre-customization/pre-link schema shape

## Trigger Conditions

Use this recovery artifact if one or more of these are true:

- finance invoice creation or edit flows fail due to schema mismatch
- requisition-to-invoice linking fails due to the new `invoiceId` relationship
- invoice rendering/settings persistence causes deploy or migration instability
- rollback must return the database to a pre-migration schema for compatibility

## Preconditions

Before executing rollback SQL:

1. stop or pause the failing rollout
2. decide whether application rollback alone is enough
3. confirm a recent database backup exists
4. confirm no newer migration depends on these columns or relationship
5. review the SQL in `rollback.sql` before execution

## Execution Order

1. roll the application back first if possible
2. execute [rollback.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260508130000_add_finance_invoice_customization_and_requisition_link/rollback.sql)
3. execute [verify.sql](/var/www/html/hotel-os/apps/api/prisma/recovery/20260508130000_add_finance_invoice_customization_and_requisition_link/verify.sql)
4. re-check `GET /api/v1/health/ready`
5. smoke-test the older finance and facilities flows

## Recovery Notes

- this rollback preserves invoice template settings and requisition invoice links in backup tables before dropping live columns
- `Invoice.counterpartyName` is also preserved in a backup table because older schema versions will no longer have that column
- backup tables are for audit/recovery use, not live application use

## Follow-up

If this script is used in a real incident:

- document the release version and commit SHA involved
- capture row counts preserved in the backup tables
- decide whether any preserved link data must be restored before re-enabling the feature in a later release
