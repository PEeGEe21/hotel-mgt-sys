-- Confirm rolled-back columns are gone.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Notification'
  AND column_name IN ('pinnedAt', 'archivedAt');

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Hotel'
  AND column_name = 'emailAutoRetryEnabled';

-- Confirm migrated notification state was preserved in metadata.
SELECT COUNT(*) AS notifications_with_state_in_metadata
FROM "Notification"
WHERE ("metadata"::jsonb ? 'pinnedAt')
   OR ("metadata"::jsonb ? 'archivedAt');

-- Sample a few rows for manual inspection if needed.
SELECT id, "metadata"
FROM "Notification"
WHERE ("metadata"::jsonb ? 'pinnedAt')
   OR ("metadata"::jsonb ? 'archivedAt')
ORDER BY "createdAt" DESC
LIMIT 10;
