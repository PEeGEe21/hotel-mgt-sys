-- Align final schema with existing local database state.
ALTER TABLE "HrContractApprovalRoute" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "HrContractApprovalRouteStep" ALTER COLUMN "updatedAt" DROP DEFAULT;
