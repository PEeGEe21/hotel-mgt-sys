/*
  Warnings:

  - You are about to drop the column `group` on the `PosTerminal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PosOrder" ADD COLUMN     "posTerminalId" TEXT;

-- AlterTable
ALTER TABLE "PosTerminal" DROP COLUMN "group",
ADD COLUMN     "terminalGroupId" TEXT,
ALTER COLUMN "location" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PosTerminalGroup" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTerminalGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosTerminalGroup_hotelId_level_idx" ON "PosTerminalGroup"("hotelId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "PosTerminalGroup_hotelId_name_key" ON "PosTerminalGroup"("hotelId", "name");

-- CreateIndex
CREATE INDEX "PosTerminal_terminalGroupId_idx" ON "PosTerminal"("terminalGroupId");

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_posTerminalId_fkey" FOREIGN KEY ("posTerminalId") REFERENCES "PosTerminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_terminalGroupId_fkey" FOREIGN KEY ("terminalGroupId") REFERENCES "PosTerminalGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTerminalGroup" ADD CONSTRAINT "PosTerminalGroup_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
