BEGIN;

-- Merge first-class notification state back into metadata so older app versions
-- can continue reading pinned/archive state after schema rollback.
UPDATE "Notification"
SET "metadata" = jsonb_strip_nulls(
  COALESCE("metadata"::jsonb, '{}'::jsonb) ||
  jsonb_build_object(
    'pinnedAt',
    CASE
      WHEN "pinnedAt" IS NOT NULL THEN to_jsonb("pinnedAt")
      ELSE NULL
    END,
    'archivedAt',
    CASE
      WHEN "archivedAt" IS NOT NULL THEN to_jsonb("archivedAt")
      ELSE NULL
    END
  )
)::json
WHERE "pinnedAt" IS NOT NULL
   OR "archivedAt" IS NOT NULL;

DROP INDEX IF EXISTS "Notification_userId_pinnedAt_idx";
DROP INDEX IF EXISTS "Notification_userId_archivedAt_idx";

ALTER TABLE "Notification"
DROP COLUMN IF EXISTS "pinnedAt",
DROP COLUMN IF EXISTS "archivedAt";

ALTER TABLE "Hotel"
DROP COLUMN IF EXISTS "emailAutoRetryEnabled";

COMMIT;
