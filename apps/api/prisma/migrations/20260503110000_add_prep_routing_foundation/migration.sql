ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COOK';

CREATE TYPE "PrepStation" AS ENUM ('NONE', 'KITCHEN', 'BAR');

CREATE TYPE "PrepStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'READY', 'FULFILLED', 'CANCELLED');

ALTER TABLE "PosProduct"
ADD COLUMN "prepStation" "PrepStation" NOT NULL DEFAULT 'NONE';

ALTER TABLE "PosOrderItem"
ADD COLUMN "prepStation" "PrepStation" NOT NULL DEFAULT 'NONE',
ADD COLUMN "prepStatus" "PrepStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN "prepStartedAt" TIMESTAMP(3),
ADD COLUMN "prepCompletedAt" TIMESTAMP(3),
ADD COLUMN "bumpedAt" TIMESTAMP(3),
ADD COLUMN "bumpedByStaffId" TEXT;

CREATE INDEX "PosProduct_hotelId_prepStation_idx" ON "PosProduct"("hotelId", "prepStation");
CREATE INDEX "PosOrderItem_orderId_prepStation_idx" ON "PosOrderItem"("orderId", "prepStation");
CREATE INDEX "PosOrderItem_prepStation_prepStatus_idx" ON "PosOrderItem"("prepStation", "prepStatus");
