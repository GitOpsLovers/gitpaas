-- `projects` and `services` — the deployable unit hierarchy.
--
-- A project groups services; a service is the thing that gets deployed (its
-- repository, branch and compose file). Kept in one file because `services`
-- carries a FK to `projects` and the two are meaningless apart.

CREATE TABLE IF NOT EXISTS "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "projectId" uuid NOT NULL, "repositoryId" text NOT NULL DEFAULT '', "deploymentBranch" text NOT NULL DEFAULT '', "composerPath" text NOT NULL DEFAULT '', CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_939f1c7659751696307d7357711') THEN
        ALTER TABLE "services" ADD CONSTRAINT "FK_939f1c7659751696307d7357711" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END
$$;
