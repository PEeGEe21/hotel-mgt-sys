/*
  Warnings:

  - You are about to drop the column `category` on the `PosProduct` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `PosProduct` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `PosProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Guest_hotelId_phoneNormalized_key";

-- AlterTable
ALTER TABLE "FolioItem" ADD COLUMN     "posOrderId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'RESERVATION';

-- AlterTable
ALTER TABLE "PosOrder" ADD COLUMN     "reservationId" TEXT;

-- AlterTable
ALTER TABLE "PosProduct" DROP COLUMN "category",
DROP COLUMN "unit",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT,
ADD COLUMN     "staffId" TEXT;

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosProductCategory" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT 'bg-blue-500',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductIngredient_hotelId_idx" ON "ProductIngredient"("hotelId");

-- CreateIndex
CREATE INDEX "ProductIngredient_productId_idx" ON "ProductIngredient"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_inventoryItemId_key" ON "ProductIngredient"("productId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "PosProductCategory_hotelId_idx" ON "PosProductCategory"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "PosProductCategory_hotelId_name_key" ON "PosProductCategory"("hotelId", "name");

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosProduct" ADD CONSTRAINT "PosProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PosProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosProductCategory" ADD CONSTRAINT "PosProductCategory_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
