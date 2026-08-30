-- `platform_settings."gitpaasDomain"` — the host the control plane answers on.
--
-- The installer wrote that host into `iac/production/.env` alone, so an administrator
-- who moved GitPaaS had to edit the file by hand on the host. The column makes the
-- database the source of truth, and the tab "Settings" writes it.
--
-- The column stays nullable, because an installation that never opened the tab keeps
-- the value of its `.env` file, and the API answers with the field absent.

ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "gitpaasDomain" text;
