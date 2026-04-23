/*
  Warnings:

  - You are about to drop the column `isActive` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `head` on the `FacilityDepartment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "isActive",
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "FacilityDepartment" DROP COLUMN "head",
ADD COLUMN     "headId" TEXT;

-- CreateIndex
CREATE INDEX "Facility_hotelId_managerId_idx" ON "Facility"("hotelId", "managerId");

-- AddForeignKey
ALTER TABLE "FacilityDepartment" ADD CONSTRAINT "FacilityDepartment_headId_fkey" FOREIGN KEY ("headId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
