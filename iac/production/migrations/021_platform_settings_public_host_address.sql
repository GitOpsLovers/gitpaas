-- `platform_settings."publicHostAddress"` — the public address, IPv4 or IPv6, that this host
-- reaches the internet through.
--
-- The check of the domain of the control plane read that address from `api.ipify.org`, so a host
-- with no outbound access to that service answered nothing, and the check refused every domain.
-- The operator writes the address in the tab "Settings", and the database is its source of truth.
--
-- The column stays nullable, because an installation that never opened the tab holds no address,
-- and the API answers with the field absent.

ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "publicHostAddress" text;
