-- AlterTable
ALTER TABLE IF EXISTS "HrContractApprovalRoute" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "HrContractApprovalRouteStep" ALTER COLUMN "updatedAt" DROP DEFAULT;
