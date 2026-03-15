/*
  Warnings:

  - A unique constraint covering the columns `[hotelId,phoneNormalized]` on the table `Guest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "phoneNormalized" TEXT;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "phoneNormalized" TEXT;

-- AlterTable
ALTER TABLE "Hotel" ADD COLUMN     "phoneNormalized" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "phoneNormalized" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Guest_hotelId_phoneNormalized_key" ON "Guest"("hotelId", "phoneNormalized");
