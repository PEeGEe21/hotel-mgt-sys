-- Confirm live ledger tables are gone.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Account', 'JournalEntry', 'JournalLine');

-- Confirm backup tables exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'Account_backup_20260326003824',
    'JournalEntry_backup_20260326003824',
    'JournalLine_backup_20260326003824'
  );

-- Confirm preserved row counts are available for inspection.
SELECT COUNT(*) AS account_backup_rows
FROM "Account_backup_20260326003824";

SELECT COUNT(*) AS journal_entry_backup_rows
FROM "JournalEntry_backup_20260326003824";

SELECT COUNT(*) AS journal_line_backup_rows
FROM "JournalLine_backup_20260326003824";

-- Sample preserved financial history for manual inspection.
SELECT *
FROM "JournalEntry_backup_20260326003824"
ORDER BY "createdAt" DESC
LIMIT 10;
