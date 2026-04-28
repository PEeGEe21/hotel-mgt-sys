UPDATE "RoleDashboardConfig"
SET "sizeOverride" = 'compact',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "widgetId" = 'outstanding_folios'
  AND "role" IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER');

UPDATE "RoleDashboardConfig"
SET "sizeOverride" = 'wide',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "widgetId" = 'housekeeping_queue'
  AND "role" = 'MANAGER';

UPDATE "RoleDashboardConfig"
SET "sizeOverride" = 'full',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "widgetId" = 'housekeeping_queue'
  AND "role" = 'HOUSEKEEPING';

UPDATE "RoleDashboardConfig"
SET "sizeOverride" = 'wide',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "widgetId" = 'my_tasks_today'
  AND "role" = 'HOUSEKEEPING';

UPDATE "RoleDashboardConfig"
SET "sizeOverride" = 'full',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "widgetId" = 'active_pos_orders'
  AND "role" = 'BARTENDER';
