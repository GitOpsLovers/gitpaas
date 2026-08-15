-- `providers` — the named source control accounts.
--
-- A provider is a GitHub App an operator registers from the browser. The private
-- key is stored sealed by AES-256-GCM under `PROVIDERS_ENCRYPTION_KEY`, so no
-- clear copy of it ever reaches this table. The name is unique across the
-- installation, and `type` prepares the next kind of provider without a change of
-- the schema. Migration `011_services_provider.sql` points every service at one
-- row of this table.

CREATE TABLE IF NOT EXISTS "providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "type" text NOT NULL DEFAULT 'github_app', "appId" text NOT NULL, "installationId" text NOT NULL, "encryptedPrivateKey" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_providers_id" PRIMARY KEY ("id"));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_providers_name') THEN
        ALTER TABLE "providers" ADD CONSTRAINT "UQ_providers_name" UNIQUE ("name");
    END IF;
END
$$;
