CREATE TABLE "HrContractApprovalRoute" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT,
  "contractType" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HrContractApprovalRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrContractApprovalRouteStep" (
  "id" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HrContractApprovalRouteStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrContractApproval" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "routeName" TEXT,
  "stepOrder" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "assignedUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "comment" TEXT,
  "actedAt" TIMESTAMP(3),
  "actedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HrContractApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HrContractApprovalRouteStep_routeId_stepOrder_key" ON "HrContractApprovalRouteStep"("routeId", "stepOrder");
CREATE INDEX "HrContractApprovalRoute_hotelId_isDefault_isActive_idx" ON "HrContractApprovalRoute"("hotelId", "isDefault", "isActive");
CREATE INDEX "HrContractApprovalRoute_hotelId_contractType_isActive_idx" ON "HrContractApprovalRoute"("hotelId", "contractType", "isActive");
CREATE INDEX "HrContractApprovalRouteStep_routeId_idx" ON "HrContractApprovalRouteStep"("routeId");
CREATE INDEX "HrContractApproval_hotelId_contractId_stepOrder_idx" ON "HrContractApproval"("hotelId", "contractId", "stepOrder");
CREATE INDEX "HrContractApproval_contractId_idx" ON "HrContractApproval"("contractId");

ALTER TABLE "HrContractApprovalRoute"
ADD CONSTRAINT "HrContractApprovalRoute_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HrContractApprovalRouteStep"
ADD CONSTRAINT "HrContractApprovalRouteStep_routeId_fkey"
FOREIGN KEY ("routeId") REFERENCES "HrContractApprovalRoute"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HrContractApproval"
ADD CONSTRAINT "HrContractApproval_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HrContractApproval"
ADD CONSTRAINT "HrContractApproval_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "HrContract"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
