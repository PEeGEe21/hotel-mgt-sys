/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Hotel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Hotel" ADD COLUMN     "domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_domain_key" ON "Hotel"("domain");
