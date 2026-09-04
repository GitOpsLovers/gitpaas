-- `services` — the persisted name of the compose project, and the name unique in its project.
--
-- Until now the system computed the name of the compose project of a service from the
-- name of that service alone, and it computed it again at every use. Two services that
-- carry the same name in two projects took the same compose project, so each one removed
-- the containers and the volumes of the other, and a rename of a service stranded its
-- resources. The name now lives in the column `composeProject`, the system writes it one
-- time at the creation of the service, and it never changes it after.
--
-- The name is `<namespace>_<project>`, and each of the two segments is the name lowered,
-- with every run of a character outside `[a-z0-9]` turned into a single `_`, and with the
-- `_` of both ends trimmed. That is the very rule of `getNameSlug` of
-- `apps/backend/src/shared/application/get-name-slug.use-case.ts`. A segment that holds no
-- usable character falls back to `namespace-<id>` or to `project-<id>`, so the name always
-- starts with a lowercase letter or with a digit, which is what Docker Compose demands.
--
-- The name of a service also becomes unique inside its project, so the pair that the
-- deployment selects can never point at two rows. A database that already holds two
-- services of one project with one name cannot take that constraint, so the first block
-- reports those rows and stops the migration, and it never fails in silence. The operator
-- renames the reported services, then applies this file again.

DO $$
DECLARE
    blocking text;
BEGIN
    SELECT string_agg(format('projectId=%s name=%L rows=%s', "projectId", "name", "rows"), ', ' ORDER BY "projectId")
    INTO blocking
    FROM (
        SELECT "projectId", "name", count(*) AS "rows"
        FROM "services"
        GROUP BY "projectId", "name"
        HAVING count(*) > 1
    ) AS duplicates;

    IF blocking IS NOT NULL THEN
        RAISE EXCEPTION 'services holds several rows with one name inside one project, so UQ_services_projectId_name cannot be created. Rename these services and apply this file again: %', blocking;
    END IF;
END
$$;

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "composeProject" text NOT NULL DEFAULT '';

UPDATE "services" AS s
SET "composeProject" =
    COALESCE(
        NULLIF(trim(both '_' from regexp_replace(lower(n."name"), '[^a-z0-9]+', '_', 'g')), ''),
        'namespace-' || n."id"::text
    )
    || '_' ||
    COALESCE(
        NULLIF(trim(both '_' from regexp_replace(lower(p."name"), '[^a-z0-9]+', '_', 'g')), ''),
        'project-' || p."id"::text
    )
FROM "projects" AS p
JOIN "namespaces" AS n ON n."id" = p."namespaceId"
WHERE p."id" = s."projectId" AND s."composeProject" = '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_services_projectId_name') THEN
        ALTER TABLE "services" ADD CONSTRAINT "UQ_services_projectId_name" UNIQUE ("projectId", "name");
    END IF;
END
$$;
