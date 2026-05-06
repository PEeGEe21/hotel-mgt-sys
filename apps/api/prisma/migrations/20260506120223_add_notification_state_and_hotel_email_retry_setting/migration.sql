ALTER TABLE "Hotel"
ADD COLUMN "emailAutoRetryEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Notification"
ADD COLUMN "pinnedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "Notification"
SET
  "pinnedAt" = CASE
    WHEN jsonb_typeof("metadata"::jsonb -> 'pinnedAt') = 'string'
      THEN ("metadata"::jsonb ->> 'pinnedAt')::timestamp
    ELSE NULL
  END,
  "archivedAt" = CASE
    WHEN jsonb_typeof("metadata"::jsonb -> 'archivedAt') = 'string'
      THEN ("metadata"::jsonb ->> 'archivedAt')::timestamp
    ELSE NULL
  END
WHERE "metadata" IS NOT NULL;

UPDATE "Notification"
SET "metadata" =
  CASE
    WHEN ("metadata"::jsonb - 'pinnedAt' - 'archivedAt') = '{}'::jsonb
      THEN NULL
    ELSE ("metadata"::jsonb - 'pinnedAt' - 'archivedAt')::json
  END
WHERE "metadata" IS NOT NULL
  AND (
    "metadata"::jsonb ? 'pinnedAt'
    OR "metadata"::jsonb ? 'archivedAt'
  );

CREATE INDEX "Notification_userId_pinnedAt_idx" ON "Notification"("userId", "pinnedAt");
CREATE INDEX "Notification_userId_archivedAt_idx" ON "Notification"("userId", "archivedAt");
