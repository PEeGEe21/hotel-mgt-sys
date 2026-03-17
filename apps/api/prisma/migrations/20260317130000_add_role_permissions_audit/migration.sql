ALTER TYPE "Role" ADD VALUE 'BARTENDER';

CREATE TYPE "PermissionChangeTarget" AS ENUM ('ROLE', 'USER');

CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PermissionAuditLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetRole" "Role",
    "targetType" "PermissionChangeTarget" NOT NULL,
    "before" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "after" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermission_hotelId_role_key" ON "RolePermission"("hotelId", "role");
CREATE INDEX "RolePermission_hotelId_idx" ON "RolePermission"("hotelId");
CREATE INDEX "PermissionAuditLog_hotelId_idx" ON "PermissionAuditLog"("hotelId");
CREATE INDEX "PermissionAuditLog_actorUserId_idx" ON "PermissionAuditLog"("actorUserId");
CREATE INDEX "PermissionAuditLog_targetUserId_idx" ON "PermissionAuditLog"("targetUserId");

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PermissionAuditLog" ADD CONSTRAINT "PermissionAuditLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PermissionAuditLog" ADD CONSTRAINT "PermissionAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PermissionAuditLog" ADD CONSTRAINT "PermissionAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
