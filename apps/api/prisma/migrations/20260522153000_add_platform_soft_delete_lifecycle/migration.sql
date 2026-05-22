ALTER TABLE "Hotel"
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "purgeAfterAt" TIMESTAMP(3);
