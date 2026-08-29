-- `platform_settings` — the parameters of the deployment system.
--
-- The table holds one row alone, and the check constraint keeps it that way: the
-- identifier is always 1. The column `logRetentionDays` states the age, in days, that
-- an archived log row keeps. The row is absent until the operator saves a value, and
-- the read of the settings falls back to the default of the backend while it is
-- absent. `updatedAt` carries the moment of the last write.

CREATE TABLE IF NOT EXISTS "platform_settings" ("id" integer NOT NULL DEFAULT 1, "logRetentionDays" integer NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_platform_settings_id" PRIMARY KEY ("id"), CONSTRAINT "CHK_platform_settings_id" CHECK ("id" = 1));
