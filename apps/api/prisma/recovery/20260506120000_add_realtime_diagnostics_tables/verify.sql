-- Confirm live diagnostics tables are gone.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('RealtimeModuleHealth', 'RealtimeEventLog');

-- Confirm backup tables exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'RealtimeModuleHealth_backup_20260506120000',
    'RealtimeEventLog_backup_20260506120000'
  );

-- Confirm preserved row counts are available for inspection.
SELECT COUNT(*) AS realtime_module_health_backup_rows
FROM "RealtimeModuleHealth_backup_20260506120000";

SELECT COUNT(*) AS realtime_event_log_backup_rows
FROM "RealtimeEventLog_backup_20260506120000";

-- Sample latest preserved settings/history rows if present.
SELECT *
FROM "RealtimeEventLog_backup_20260506120000"
ORDER BY "createdAt" DESC
LIMIT 10;
