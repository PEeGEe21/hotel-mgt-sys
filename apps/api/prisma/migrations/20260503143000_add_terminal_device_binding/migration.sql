-- AlterTable
ALTER TABLE "PosTerminal"
ADD COLUMN "setupCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN "registeredDeviceKeyHash" TEXT,
ADD COLUMN "registeredDeviceName" TEXT,
ADD COLUMN "registeredIpAddress" TEXT,
ADD COLUMN "registeredAt" TIMESTAMP(3);
