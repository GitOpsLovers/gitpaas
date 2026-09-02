-- `namespaces` — the description and the date of birth.
--
-- A card of a namespace showed the name alone, so a user could not tell what the scope
-- was for, nor when it was born. `019_projects_services_description_created_at.sql` gave
-- the same two columns to `projects` and to `services`, and a namespace was the one
-- resource of the three that still lacked them. This file closes that gap with the very
-- same shape: `description`, a free text the form of a namespace writes, and `createdAt`,
-- the instant of the creation of the row.
--
-- The description defaults to the empty string, so a row that existed before this file
-- keeps a value and never a `NULL`. The date defaults to `now()`, so such a row takes the
-- instant of the migration, and never a `NULL`. TypeORM declares `createdAt` with
-- `@CreateDateColumn({ type: 'timestamptz' })`, which is the type of `projects."createdAt"`
-- of `019_projects_services_description_created_at.sql`.

ALTER TABLE "namespaces" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';

ALTER TABLE "namespaces" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
