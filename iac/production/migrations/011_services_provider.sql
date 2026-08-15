-- `services."providerId"` — the source control account a service reaches its repository through.
--
-- Every service must point at exactly one provider, so this file adds the column
-- empty, fills it from the single row of `providers`, and only then locks the
-- column to NOT NULL. The foreign key uses RESTRICT, so a provider that still
-- holds services can never be deleted.
--
-- An installation that already holds services must register a provider before it
-- applies this migration: with no provider row, the NOT NULL step fails.

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "providerId" uuid;

UPDATE "services" SET "providerId" = (SELECT "id" FROM "providers" ORDER BY "createdAt" ASC LIMIT 1) WHERE "providerId" IS NULL;

ALTER TABLE "services" ALTER COLUMN "providerId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_services_providerId') THEN
        ALTER TABLE "services" ADD CONSTRAINT "FK_services_providerId" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    END IF;
END
$$;
