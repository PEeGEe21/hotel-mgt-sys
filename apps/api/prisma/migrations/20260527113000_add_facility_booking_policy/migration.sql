CREATE TYPE "FacilityBookingPolicy" AS ENUM ('EXCLUSIVE', 'SHARED');

ALTER TABLE "Facility"
ADD COLUMN "bookingPolicy" "FacilityBookingPolicy" NOT NULL DEFAULT 'EXCLUSIVE';
