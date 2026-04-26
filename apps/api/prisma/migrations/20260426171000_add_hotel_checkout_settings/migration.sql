ALTER TABLE "Hotel"
ADD COLUMN "defaultCheckoutHour" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN "defaultCheckoutMinute" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "guestCheckoutReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoCreateCheckoutHousekeepingTasks" BOOLEAN NOT NULL DEFAULT true;
