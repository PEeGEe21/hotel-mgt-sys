CREATE TABLE "JobTitle" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'bg-cyan-500',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Staff" ADD COLUMN "jobTitleId" TEXT;

CREATE UNIQUE INDEX "JobTitle_hotelId_name_key" ON "JobTitle"("hotelId", "name");
CREATE INDEX "JobTitle_hotelId_idx" ON "JobTitle"("hotelId");
CREATE INDEX "JobTitle_hotelId_departmentId_idx" ON "JobTitle"("hotelId", "departmentId");
CREATE INDEX "Staff_hotelId_jobTitleId_idx" ON "Staff"("hotelId", "jobTitleId");

ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
