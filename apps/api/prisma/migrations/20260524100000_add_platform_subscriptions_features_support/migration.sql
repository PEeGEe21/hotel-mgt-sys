DO $$
BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FeatureScopeType" AS ENUM ('MODULE', 'SUB_FEATURE', 'LIMIT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FeatureRolloutStage" AS ENUM ('INTERNAL', 'BETA', 'GA', 'DEPRECATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SupportCaseSource" AS ENUM ('HOTEL', 'PLATFORM', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SupportCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_ON_HOTEL', 'RESOLVED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SupportCommentVisibility" AS ENUM ('INTERNAL', 'HOTEL_VISIBLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "FeatureFlag"
ADD COLUMN "name" TEXT,
ADD COLUMN "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "category" TEXT,
ADD COLUMN "scopeType" "FeatureScopeType" NOT NULL DEFAULT 'MODULE',
ADD COLUMN "rolloutStage" "FeatureRolloutStage" NOT NULL DEFAULT 'GA';

CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceMonthly" DECIMAL(65,30),
  "priceYearly" DECIMAL(65,30),
  "billingIntervalOptions" TEXT[] NOT NULL DEFAULT ARRAY['MONTHLY', 'YEARLY']::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE INDEX "SubscriptionPlan_isActive_sortOrder_idx" ON "SubscriptionPlan"("isActive", "sortOrder");

CREATE TABLE "HotelSubscription" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "planId" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "billingEmail" TEXT,
  "billingContactName" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HotelSubscription_hotelId_updatedAt_idx" ON "HotelSubscription"("hotelId", "updatedAt");
CREATE INDEX "HotelSubscription_status_idx" ON "HotelSubscription"("status");
CREATE INDEX "HotelSubscription_planId_idx" ON "HotelSubscription"("planId");

CREATE TABLE "PlanFeatureEntitlement" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "flagKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limitValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanFeatureEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanFeatureEntitlement_planId_flagKey_key" ON "PlanFeatureEntitlement"("planId", "flagKey");
CREATE INDEX "PlanFeatureEntitlement_flagKey_idx" ON "PlanFeatureEntitlement"("flagKey");

CREATE TABLE "HotelFeatureOverride" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "flagKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "limitValue" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelFeatureOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelFeatureOverride_hotelId_flagKey_key" ON "HotelFeatureOverride"("hotelId", "flagKey");
CREATE INDEX "HotelFeatureOverride_flagKey_idx" ON "HotelFeatureOverride"("flagKey");

CREATE TABLE "SupportCase" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "source" "SupportCaseSource" NOT NULL DEFAULT 'HOTEL',
  "category" TEXT NOT NULL,
  "priority" "SupportCasePriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "assignedAdminId" TEXT,
  "subscriptionSnapshot" JSONB,
  "entitlementSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportCase_hotelId_createdAt_idx" ON "SupportCase"("hotelId", "createdAt");
CREATE INDEX "SupportCase_status_priority_idx" ON "SupportCase"("status", "priority");
CREATE INDEX "SupportCase_assignedAdminId_status_idx" ON "SupportCase"("assignedAdminId", "status");

CREATE TABLE "SupportCaseEvent" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportCaseEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportCaseEvent_caseId_createdAt_idx" ON "SupportCaseEvent"("caseId", "createdAt");

CREATE TABLE "SupportCaseComment" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "visibility" "SupportCommentVisibility" NOT NULL DEFAULT 'INTERNAL',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportCaseComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportCaseComment_caseId_createdAt_idx" ON "SupportCaseComment"("caseId", "createdAt");

ALTER TABLE "HotelSubscription"
ADD CONSTRAINT "HotelSubscription_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HotelSubscription"
ADD CONSTRAINT "HotelSubscription_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanFeatureEntitlement"
ADD CONSTRAINT "PlanFeatureEntitlement_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanFeatureEntitlement"
ADD CONSTRAINT "PlanFeatureEntitlement_flagKey_fkey"
FOREIGN KEY ("flagKey") REFERENCES "FeatureFlag"("key")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HotelFeatureOverride"
ADD CONSTRAINT "HotelFeatureOverride_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HotelFeatureOverride"
ADD CONSTRAINT "HotelFeatureOverride_flagKey_fkey"
FOREIGN KEY ("flagKey") REFERENCES "FeatureFlag"("key")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportCase"
ADD CONSTRAINT "SupportCase_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportCase"
ADD CONSTRAINT "SupportCase_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportCase"
ADD CONSTRAINT "SupportCase_assignedAdminId_fkey"
FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportCaseEvent"
ADD CONSTRAINT "SupportCaseEvent_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportCaseEvent"
ADD CONSTRAINT "SupportCaseEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportCaseComment"
ADD CONSTRAINT "SupportCaseComment_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportCaseComment"
ADD CONSTRAINT "SupportCaseComment_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
