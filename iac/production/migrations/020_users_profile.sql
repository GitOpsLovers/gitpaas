-- `users` — the display name and the second factor.
--
-- A user carried the email address alone, so the interface showed no name, and the
-- account held no second factor. The table takes three columns. `displayName` is the
-- free text that the header and the card of the profile show; it stays `NULL` while
-- the user writes none, and the interface falls back to the email address.
-- `totpSecret` holds the sealed secret of the application of the codes, and it never
-- crosses the wire. `totpEnabledAt` carries the instant that the user confirmed the
-- first code; while it is `NULL`, the second factor is off, and a secret alone means
-- a setup that nobody confirmed.
--
-- The three columns are nullable, so a row that existed before this file keeps its
-- meaning: no display name, and no second factor.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "displayName" text;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpSecret" text;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpEnabledAt" TIMESTAMP WITH TIME ZONE;
