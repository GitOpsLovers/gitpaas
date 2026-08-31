-- `projects` and `services` — the description and the date of birth.
--
-- A card of a project and a card of a service showed the name alone, so a user could
-- not tell what the record was about, nor when it was born. Both tables take the same
-- two columns: `description`, a free text the two forms write, and `createdAt`, the
-- instant of the creation of the row.
--
-- The description defaults to the empty string, so a row that existed before this file
-- keeps a value and never a `NULL`, exactly as `repositoryId` of `004_projects_services.sql`
-- does. The date defaults to `now()`, so a row that existed before this file takes the
-- instant of the migration, and never a `NULL`. TypeORM declares `createdAt` with
-- `@CreateDateColumn({ type: 'timestamptz' })`, which is the type of `providers."createdAt"`
-- of `010_providers.sql`.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
