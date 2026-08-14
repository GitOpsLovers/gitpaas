-- `namespaces` — the top-level grouping that holds projects.
--
-- A namespace groups projects the same way a project groups services. Every
-- project must belong to exactly one namespace, so this file also creates the
-- `default` namespace, attaches every existing project to it, and only then
-- locks `projects."namespaceId"` to NOT NULL. The project name becomes unique
-- inside its namespace, and the foreign key uses RESTRICT so a namespace that
-- still holds projects can never be deleted.

CREATE TABLE IF NOT EXISTS "namespaces" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_namespaces_id" PRIMARY KEY ("id"));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_namespaces_name') THEN
        ALTER TABLE "namespaces" ADD CONSTRAINT "UQ_namespaces_name" UNIQUE ("name");
    END IF;
END
$$;

INSERT INTO "namespaces" ("name") SELECT 'default' WHERE NOT EXISTS (SELECT 1 FROM "namespaces" WHERE "name" = 'default');

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "namespaceId" uuid;

UPDATE "projects" SET "namespaceId" = (SELECT "id" FROM "namespaces" WHERE "name" = 'default') WHERE "namespaceId" IS NULL;

ALTER TABLE "projects" ALTER COLUMN "namespaceId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_projects_namespaceId') THEN
        ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_namespaceId" FOREIGN KEY ("namespaceId") REFERENCES "namespaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_projects_namespaceId_name') THEN
        ALTER TABLE "projects" ADD CONSTRAINT "UQ_projects_namespaceId_name" UNIQUE ("namespaceId", "name");
    END IF;
END
$$;
