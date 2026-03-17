CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'bg-blue-500',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT NOT NULL DEFAULT 'bg-blue-500',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomTypeConfig" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "beds" TEXT NOT NULL DEFAULT '1 Queen',
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT NOT NULL DEFAULT 'bg-blue-500',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomTypeConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryCategory_hotelId_name_key" ON "InventoryCategory"("hotelId", "name");
CREATE INDEX "InventoryCategory_hotelId_idx" ON "InventoryCategory"("hotelId");

CREATE UNIQUE INDEX "Supplier_hotelId_name_key" ON "Supplier"("hotelId", "name");
CREATE INDEX "Supplier_hotelId_idx" ON "Supplier"("hotelId");

CREATE UNIQUE INDEX "ShiftTemplate_hotelId_name_key" ON "ShiftTemplate"("hotelId", "name");
CREATE INDEX "ShiftTemplate_hotelId_idx" ON "ShiftTemplate"("hotelId");

CREATE UNIQUE INDEX "RoomTypeConfig_hotelId_name_key" ON "RoomTypeConfig"("hotelId", "name");
CREATE INDEX "RoomTypeConfig_hotelId_idx" ON "RoomTypeConfig"("hotelId");

ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomTypeConfig" ADD CONSTRAINT "RoomTypeConfig_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
