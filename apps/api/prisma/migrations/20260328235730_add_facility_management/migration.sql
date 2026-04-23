/*
  Warnings:

  - You are about to drop the column `location` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Facility` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "location",
DROP COLUMN "type",
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "typeId" TEXT;

-- CreateTable
CREATE TABLE "FacilityType" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityLocation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityDepartment" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "head" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityType_hotelId_idx" ON "FacilityType"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityType_hotelId_name_key" ON "FacilityType"("hotelId", "name");

-- CreateIndex
CREATE INDEX "FacilityLocation_hotelId_idx" ON "FacilityLocation"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityLocation_hotelId_name_key" ON "FacilityLocation"("hotelId", "name");

-- CreateIndex
CREATE INDEX "FacilityDepartment_hotelId_idx" ON "FacilityDepartment"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityDepartment_hotelId_name_key" ON "FacilityDepartment"("hotelId", "name");

-- CreateIndex
CREATE INDEX "Facility_hotelId_typeId_idx" ON "Facility"("hotelId", "typeId");

-- CreateIndex
CREATE INDEX "Facility_hotelId_locationId_idx" ON "Facility"("hotelId", "locationId");

-- CreateIndex
CREATE INDEX "Facility_hotelId_departmentId_idx" ON "Facility"("hotelId", "departmentId");

-- AddForeignKey
ALTER TABLE "FacilityType" ADD CONSTRAINT "FacilityType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityLocation" ADD CONSTRAINT "FacilityLocation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityDepartment" ADD CONSTRAINT "FacilityDepartment_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "FacilityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "FacilityLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "FacilityDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
