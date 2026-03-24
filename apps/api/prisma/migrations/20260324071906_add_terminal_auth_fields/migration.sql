-- AlterTable
ALTER TABLE "PosTerminal" ADD COLUMN     "currentStaffId" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "setupCode" TEXT,
ADD COLUMN     "setupCodeQr" TEXT;

-- AddForeignKey
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_currentStaffId_fkey" FOREIGN KEY ("currentStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
