-- `provider_registrations` — the registrations of a GitHub App that run.
--
-- One row lives from the moment an operator starts a registration until the App is
-- installed, at most twelve hours. Between the conversion of the manifest and the
-- installation the row holds the private key of a real GitHub App, sealed by
-- AES-256-GCM under `PROVIDERS_ENCRYPTION_KEY`, exactly as the `providers` table of
-- `010_providers.sql` holds it. A scheduled job removes every row that passed
-- `expiresAt`, so no key of an abandoned registration stays. The column `state`
-- carries a unique index, because every call after the first one finds the row by it.

CREATE TABLE IF NOT EXISTS "provider_registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "state" text NOT NULL, "name" text NOT NULL, "ownerType" text NOT NULL, "ownerLogin" text, "step" text NOT NULL DEFAULT 'awaiting_creation', "appId" text, "appSlug" text, "encryptedPrivateKey" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_provider_registrations_id" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_provider_registrations_state" ON "provider_registrations" ("state");
