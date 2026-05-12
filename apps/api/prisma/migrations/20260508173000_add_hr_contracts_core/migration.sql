-- CreateTable
CREATE TABLE "HrContract" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "departmentId" TEXT,
    "positionTitle" TEXT NOT NULL,
    "staffNameSnapshot" TEXT NOT NULL,
    "employeeCodeSnapshot" TEXT NOT NULL,
    "departmentSnapshot" TEXT NOT NULL,
    "positionSnapshot" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "salary" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "probationEndDate" TIMESTAMP(3),
    "reportingManagerStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCompensationHistory" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "contractId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCompensationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrContract_contractNo_key" ON "HrContract"("contractNo");

-- CreateIndex
CREATE INDEX "HrContract_hotelId_idx" ON "HrContract"("hotelId");
CREATE INDEX "HrContract_hotelId_staffId_idx" ON "HrContract"("hotelId", "staffId");
CREATE INDEX "HrContract_hotelId_departmentId_idx" ON "HrContract"("hotelId", "departmentId");
CREATE INDEX "HrContract_hotelId_status_idx" ON "HrContract"("hotelId", "status");
CREATE INDEX "HrContract_hotelId_type_idx" ON "HrContract"("hotelId", "type");
CREATE INDEX "HrContract_hotelId_endDate_idx" ON "HrContract"("hotelId", "endDate");

-- CreateIndex
CREATE INDEX "StaffCompensationHistory_hotelId_idx" ON "StaffCompensationHistory"("hotelId");
CREATE INDEX "StaffCompensationHistory_hotelId_staffId_effectiveFrom_idx" ON "StaffCompensationHistory"("hotelId", "staffId", "effectiveFrom");
CREATE INDEX "StaffCompensationHistory_contractId_idx" ON "StaffCompensationHistory"("contractId");

-- AddForeignKey
ALTER TABLE "HrContract" ADD CONSTRAINT "HrContract_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HrContract" ADD CONSTRAINT "HrContract_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HrContract" ADD CONSTRAINT "HrContract_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCompensationHistory" ADD CONSTRAINT "StaffCompensationHistory_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffCompensationHistory" ADD CONSTRAINT "StaffCompensationHistory_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffCompensationHistory" ADD CONSTRAINT "StaffCompensationHistory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "HrContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
