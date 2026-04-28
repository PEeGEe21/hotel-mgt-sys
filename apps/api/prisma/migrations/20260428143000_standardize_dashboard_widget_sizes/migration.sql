UPDATE "DashboardWidget"
SET "allowedSizes" = ARRAY['compact', 'wide', 'full']::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "allowedSizes" IS DISTINCT FROM ARRAY['compact', 'wide', 'full']::TEXT[];
