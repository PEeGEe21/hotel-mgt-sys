-- Add description and sellPrice to inventory items
ALTER TABLE "InventoryItem"
ADD COLUMN "description" TEXT,
ADD COLUMN "sellPrice" DECIMAL(65,30);
