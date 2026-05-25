CREATE TABLE "HotelBannerDismissal" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "contextHash" TEXT NOT NULL,
  "dismissedUntil" TIMESTAMP(3) NOT NULL,
  "dismissedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HotelBannerDismissal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelBannerDismissal_hotelId_key_key" ON "HotelBannerDismissal"("hotelId", "key");
CREATE INDEX "HotelBannerDismissal_hotelId_dismissedUntil_idx" ON "HotelBannerDismissal"("hotelId", "dismissedUntil");

ALTER TABLE "HotelBannerDismissal"
ADD CONSTRAINT "HotelBannerDismissal_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
