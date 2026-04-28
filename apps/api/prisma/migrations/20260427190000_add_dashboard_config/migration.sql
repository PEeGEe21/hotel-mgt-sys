-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "featureFlag" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultSize" TEXT NOT NULL DEFAULT 'compact',
    "allowedSizes" TEXT[] NOT NULL DEFAULT ARRAY['compact', 'wide', 'full']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDashboardConfig" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "widgetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sizeOverride" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDashboardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "planRequired" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "DashboardWidget_permissionKey_idx" ON "DashboardWidget"("permissionKey");

-- CreateIndex
CREATE INDEX "DashboardWidget_featureFlag_idx" ON "DashboardWidget"("featureFlag");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDashboardConfig_hotelId_role_widgetId_key" ON "RoleDashboardConfig"("hotelId", "role", "widgetId");

-- CreateIndex
CREATE INDEX "RoleDashboardConfig_hotelId_role_position_idx" ON "RoleDashboardConfig"("hotelId", "role", "position");

-- CreateIndex
CREATE INDEX "RoleDashboardConfig_widgetId_idx" ON "RoleDashboardConfig"("widgetId");

-- AddForeignKey
ALTER TABLE "RoleDashboardConfig" ADD CONSTRAINT "RoleDashboardConfig_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDashboardConfig" ADD CONSTRAINT "RoleDashboardConfig_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "DashboardWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
