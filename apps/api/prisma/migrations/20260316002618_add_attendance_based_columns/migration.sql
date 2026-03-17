-- AlterTable
ALTER TABLE "Hotel" ADD COLUMN     "attendancePinRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "taxRate" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLastUsedAt" TIMESTAMP(3),
ADD COLUMN     "pinUpdatedAt" TIMESTAMP(3);
