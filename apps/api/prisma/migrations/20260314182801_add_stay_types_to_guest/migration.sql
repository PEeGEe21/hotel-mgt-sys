-- AlterEnum
ALTER TYPE "RoomStatus" ADD VALUE 'HOUSEKEEPING';

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "stayType" TEXT;
