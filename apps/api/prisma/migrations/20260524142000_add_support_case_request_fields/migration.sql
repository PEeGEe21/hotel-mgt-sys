-- Add structured tenant support request context for commercial/admin escalations
ALTER TABLE "SupportCase"
ADD COLUMN "requestType" TEXT,
ADD COLUMN "requestPayload" JSONB;

CREATE INDEX "SupportCase_requestType_idx" ON "SupportCase"("requestType");
