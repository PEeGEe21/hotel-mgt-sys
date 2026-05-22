-- CreateEnum
CREATE TYPE "HotelOnboardingStatus" AS ENUM ('PENDING_SETUP', 'ROOMS_ADDED', 'STAFF_INVITED', 'ACTIVE');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_hotelId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "hotelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Hotel" ADD COLUMN     "onboardingStatus" "HotelOnboardingStatus" NOT NULL DEFAULT 'PENDING_SETUP',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "mfaSetupAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
