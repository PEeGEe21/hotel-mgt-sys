BEGIN;

-- Preserve realtime diagnostics data before removing the live tables.
CREATE TABLE IF NOT EXISTS "RealtimeModuleHealth_backup_20260506120000" AS
SELECT *
FROM "RealtimeModuleHealth";

CREATE TABLE IF NOT EXISTS "RealtimeEventLog_backup_20260506120000" AS
SELECT *
FROM "RealtimeEventLog";

DROP TABLE IF EXISTS "RealtimeModuleHealth" CASCADE;
DROP TABLE IF EXISTS "RealtimeEventLog" CASCADE;

COMMIT;
