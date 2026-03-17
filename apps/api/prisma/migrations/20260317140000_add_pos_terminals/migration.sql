CREATE TABLE "PosTerminal" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "staffId" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Online',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PosTerminal_hotelId_idx" ON "PosTerminal"("hotelId");
CREATE INDEX "PosTerminal_staffId_idx" ON "PosTerminal"("staffId");

ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
