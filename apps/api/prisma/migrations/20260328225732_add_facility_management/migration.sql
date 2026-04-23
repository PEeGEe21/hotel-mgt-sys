/*
  Warnings:

  - A unique constraint covering the columns `[facilityBookingId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount` to the `FacilityBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chargeType` to the `FacilityBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMins` to the `FacilityBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `FacilityBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FacilityBooking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "amenities" TEXT[],
ADD COLUMN     "baseRate" DECIMAL(65,30),
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maxDurationMins" INTEGER,
ADD COLUMN     "minDurationMins" INTEGER,
ADD COLUMN     "operatingSchedule" JSONB,
ADD COLUMN     "rateUnit" TEXT,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FacilityBooking" ADD COLUMN     "amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "chargeType" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "creditNoteId" TEXT,
ADD COLUMN     "durationMins" INTEGER NOT NULL,
ADD COLUMN     "guestId" TEXT,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pax" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundMethod" TEXT,
ADD COLUMN     "reservationId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FolioItem" ADD COLUMN     "facilityBookingId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "facilityBookingId" TEXT;

-- CreateTable
CREATE TABLE "FacilityRequisition" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "estimatedTotal" DECIMAL(65,30),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "inventoryLinked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "facilityId" TEXT,
    "roomId" TEXT,
    "requestNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedBy" TEXT,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "estimatedMins" INTEGER,
    "actualMins" INTEGER,
    "partsUsed" JSONB,
    "totalCost" DECIMAL(65,30),
    "images" TEXT[],
    "notes" TEXT,
    "inspectionId" TEXT,
    "verificationInspectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityComplaint" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "complaintNo" TEXT NOT NULL,
    "reporterType" TEXT NOT NULL,
    "reporterStaffId" TEXT,
    "reporterGuestId" TEXT,
    "channel" TEXT NOT NULL,
    "facilityId" TEXT,
    "roomId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "maintenanceRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityInspection" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "inspectionNo" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "scheduledBy" TEXT NOT NULL,
    "inspectorName" TEXT,
    "inspectorOrganization" TEXT,
    "facilityId" TEXT,
    "area" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "checklist" JSONB,
    "findings" TEXT,
    "score" INTEGER,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityRequisition_hotelId_idx" ON "FacilityRequisition"("hotelId");

-- CreateIndex
CREATE INDEX "FacilityRequisition_hotelId_facilityId_idx" ON "FacilityRequisition"("hotelId", "facilityId");

-- CreateIndex
CREATE INDEX "FacilityRequisition_hotelId_status_idx" ON "FacilityRequisition"("hotelId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_hotelId_idx" ON "MaintenanceRequest"("hotelId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_hotelId_status_idx" ON "MaintenanceRequest"("hotelId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_hotelId_facilityId_idx" ON "MaintenanceRequest"("hotelId", "facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_hotelId_requestNo_key" ON "MaintenanceRequest"("hotelId", "requestNo");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityComplaint_maintenanceRequestId_key" ON "FacilityComplaint"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "FacilityComplaint_hotelId_idx" ON "FacilityComplaint"("hotelId");

-- CreateIndex
CREATE INDEX "FacilityComplaint_hotelId_status_idx" ON "FacilityComplaint"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityComplaint_hotelId_complaintNo_key" ON "FacilityComplaint"("hotelId", "complaintNo");

-- CreateIndex
CREATE INDEX "FacilityInspection_hotelId_idx" ON "FacilityInspection"("hotelId");

-- CreateIndex
CREATE INDEX "FacilityInspection_hotelId_status_idx" ON "FacilityInspection"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityInspection_hotelId_inspectionNo_key" ON "FacilityInspection"("hotelId", "inspectionNo");

-- CreateIndex
CREATE INDEX "FacilityBooking_hotelId_facilityId_idx" ON "FacilityBooking"("hotelId", "facilityId");

-- CreateIndex
CREATE INDEX "FacilityBooking_hotelId_reservationId_idx" ON "FacilityBooking"("hotelId", "reservationId");

-- CreateIndex
CREATE INDEX "FolioItem_hotelId_facilityBookingId_idx" ON "FolioItem"("hotelId", "facilityBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_facilityBookingId_key" ON "Invoice"("facilityBookingId");

-- CreateIndex
CREATE INDEX "Invoice_hotelId_facilityBookingId_idx" ON "Invoice"("hotelId", "facilityBookingId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_facilityBookingId_fkey" FOREIGN KEY ("facilityBookingId") REFERENCES "FacilityBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioItem" ADD CONSTRAINT "FolioItem_facilityBookingId_fkey" FOREIGN KEY ("facilityBookingId") REFERENCES "FacilityBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityBooking" ADD CONSTRAINT "FacilityBooking_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityRequisition" ADD CONSTRAINT "FacilityRequisition_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityRequisition" ADD CONSTRAINT "FacilityRequisition_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityRequisition" ADD CONSTRAINT "FacilityRequisition_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityRequisition" ADD CONSTRAINT "FacilityRequisition_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "FacilityInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_verificationInspectionId_fkey" FOREIGN KEY ("verificationInspectionId") REFERENCES "FacilityInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityComplaint" ADD CONSTRAINT "FacilityComplaint_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityComplaint" ADD CONSTRAINT "FacilityComplaint_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityComplaint" ADD CONSTRAINT "FacilityComplaint_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityComplaint" ADD CONSTRAINT "FacilityComplaint_reporterStaffId_fkey" FOREIGN KEY ("reporterStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityComplaint" ADD CONSTRAINT "FacilityComplaint_reporterGuestId_fkey" FOREIGN KEY ("reporterGuestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityComplaint" ADD CONSTRAINT "FacilityComplaint_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityInspection" ADD CONSTRAINT "FacilityInspection_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityInspection" ADD CONSTRAINT "FacilityInspection_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityInspection" ADD CONSTRAINT "FacilityInspection_scheduledBy_fkey" FOREIGN KEY ("scheduledBy") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
