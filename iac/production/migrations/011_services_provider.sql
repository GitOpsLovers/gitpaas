-- `services."providerId"` — the source control account a service reaches its repository through.
--
-- A service points at one provider at most, so the column stays nullable: a new
-- service starts with no provider, and the "Provider" tab of its detail sets one
-- later. This file adds the column empty and fills it from the single row of
-- `providers`, so an installation with exactly one provider keeps every service
-- deployable. The foreign key uses RESTRICT, so a provider that still holds
-- services can never be deleted.
--
-- An installation with no provider, or with several providers, keeps the column
-- empty. Those services stop being deployable until an operator opens each one
-- and sets its provider.

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "providerId" uuid;

UPDATE "services" SET "providerId" = (SELECT "id" FROM "providers" ORDER BY "createdAt" ASC LIMIT 1) WHERE "providerId" IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_services_providerId') THEN
        ALTER TABLE "services" ADD CONSTRAINT "FK_services_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    END IF;
END
$$;
