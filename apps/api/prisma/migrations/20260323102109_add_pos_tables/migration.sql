-- AlterTable
ALTER TABLE "PosOrder" ADD COLUMN     "tableId" TEXT;

-- CreateTable
CREATE TABLE "PosTable" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosTable_hotelId_idx" ON "PosTable"("hotelId");

-- CreateIndex
CREATE INDEX "PosTable_hotelId_section_idx" ON "PosTable"("hotelId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "PosTable_hotelId_name_key" ON "PosTable"("hotelId", "name");

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "PosTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTable" ADD CONSTRAINT "PosTable_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
