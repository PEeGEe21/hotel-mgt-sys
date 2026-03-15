/*
  Warnings:

  - You are about to drop the column `floor` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "floor",
ADD COLUMN     "floorId" TEXT;

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Floor_hotelId_idx" ON "Floor"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_hotelId_name_key" ON "Floor"("hotelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_hotelId_level_key" ON "Floor"("hotelId", "level");

-- CreateIndex
CREATE INDEX "Room_hotelId_floorId_idx" ON "Room"("hotelId", "floorId");

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
