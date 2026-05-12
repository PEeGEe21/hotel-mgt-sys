-- CreateTable
CREATE TABLE "HrContractDocument" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrContractDocument_hotelId_idx" ON "HrContractDocument"("hotelId");
CREATE INDEX "HrContractDocument_contractId_idx" ON "HrContractDocument"("contractId");
CREATE INDEX "HrContractDocument_hotelId_contractId_uploadedAt_idx" ON "HrContractDocument"("hotelId", "contractId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "HrContractDocument" ADD CONSTRAINT "HrContractDocument_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HrContractDocument" ADD CONSTRAINT "HrContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "HrContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
